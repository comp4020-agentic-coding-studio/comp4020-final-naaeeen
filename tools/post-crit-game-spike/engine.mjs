// Isolated technical spike. No transport, database, authentication or production imports.
export function createEngine(Chess) {
  const suits = ['C', 'D', 'H', 'S'];
  const clone = value => structuredClone(value);
  const rank = card => card.slice(0, -1);
  const suit = card => card.slice(-1);
  const chessAt = game => {
    const board = game.initialFen ? new Chess(game.initialFen) : new Chess();
    for (const move of game.moves) board.move(move);
    return board;
  };
  const cardsLegal = (game, actor, card) => game.hands[actor].includes(card)
    && (rank(card) === '8' || suit(card) === game.activeSuit || (rank(game.top) !== '8' && rank(card) === rank(game.top)));
  function initial(kind, count = 2, now = 0) {
    const members = Array.from({length: count}, (_, i) => `p${i + 1}`);
    const players = kind === 'cards' ? members : members.slice(0, 2);
    const base = {kind, session: 'round-1', revision: 0, members, players, turn: 0, result: null, receipts: {}};
    if (kind === 'four') return {...base, board: Array(42).fill(null)};
    if (kind === 'chess') return {...base, initialFen: null, moves: [], clocks: [180000, 180000], turnStartedAt: now};
    // Deliberate reproducible fixture, NOT a secure/random production deck.
    const deck = suits.flatMap(s => ['A','2','3','4','5','6','7','8','9','10','J','Q','K'].map(r => r + s));
    const hands = Object.fromEntries(players.map(actor => [actor, []]));
    for (let n = 0; n < 5; n++) for (const actor of players) hands[actor].push(deck.shift());
    while (rank(deck[0]) === '8') deck.push(deck.shift());
    const top = deck.shift();
    return {...base, hands, deck, top, activeSuit: suit(top), passes: 0};
  }
  function project(game, actor) {
    const {receipts, hands, deck, ...visible} = clone(game);
    if (game.kind !== 'cards') return visible;
    return {...visible, counts: Object.fromEntries(game.players.map(id => [id, hands[id].length])), stockCount: deck.length,
      hand: game.players.includes(actor) ? hands[actor] : []};
  }
  function legal(game, actor) {
    if (game.result || game.players[game.turn] !== actor) return [];
    if (game.kind === 'four') return Array.from({length: 7}, (_, column) => column).filter(column => !game.board[column]);
    if (game.kind === 'chess') return chessAt(game).moves({verbose: true}).map(m => ({from: m.from, to: m.to, ...(m.promotion ? {promotion:m.promotion} : {})}));
    return game.hands[actor].filter(card => cardsLegal(game, actor, card));
  }
  function apply(game, actor, action, now) {
    if (action.type === 'leave') {game.result = {reason:'member-left', actor}; return;}
    if (game.kind === 'four') {
      const column = action.column;
      if (!Number.isInteger(column) || !legal(game, actor).includes(column)) throw new Error('ILLEGAL');
      let row = 5; while (game.board[row * 7 + column]) row--;
      game.board[row * 7 + column] = actor;
      for (const [dx,dy] of [[1,0],[0,1],[1,1],[1,-1]]) {
        let length = 1;
        for (const direction of [-1,1]) for (let n=1;n<4;n++) {
          const x=column+dx*n*direction, y=row+dy*n*direction;
          if (x<0 || x>=7 || y<0 || y>=6 || game.board[y*7+x]!==actor) break;
          length++;
        }
        if (length>=4) game.result = {reason:'four', winner:actor};
      }
      if (!game.result && game.board.every(Boolean)) game.result = {reason:'filled-draw'};
    } else if (game.kind === 'chess') {
      const elapsed = Math.max(0, now-game.turnStartedAt);
      game.clocks[game.turn] = Math.max(0, game.clocks[game.turn]-elapsed);
      if (!game.clocks[game.turn]) {
        // Timeout adjudication is deliberately conservative: full FIDE mating-possibility is unresolved.
        game.result = {reason:'clock-expired', loser:actor, adjudication:'pending-policy'}; return;
      }
      const board = chessAt(game);
      let move; try {move=board.move(action.move);} catch {throw new Error('ILLEGAL');}
      if (!move) throw new Error('ILLEGAL');
      game.moves.push({from:move.from,to:move.to,...(move.promotion?{promotion:move.promotion}:{})});
      game.turnStartedAt=now;
      if (board.isCheckmate()) game.result={reason:'checkmate',winner:actor};
      else if (board.isDraw()) game.result={reason:'library-draw'};
    } else {
      if (action.type === 'draw') {
        if (!game.deck.length) throw new Error('EMPTY-STOCK');
        game.hands[actor].push(game.deck.shift()); game.passes=0; return;
      }
      if (action.type === 'pass') {
        if (game.deck.length || legal(game, actor).length) throw new Error('ILLEGAL-PASS');
        game.passes++;
        if (game.passes>=game.players.length) game.result={reason:'blocked-draw'};
      } else {
        if (!cardsLegal(game, actor, action.card)) throw new Error('ILLEGAL');
        if (rank(action.card)==='8' && !suits.includes(action.suit)) throw new Error('SUIT-REQUIRED');
        game.hands[actor].splice(game.hands[actor].indexOf(action.card),1);
        game.top=action.card; game.activeSuit=rank(action.card)==='8'?action.suit:suit(action.card); game.passes=0;
        if (!game.hands[actor].length) game.result={reason:'empty-hand',winner:actor};
      }
    }
    game.turn=(game.turn+1)%game.players.length;
  }
  function command(state, context, request) {
    // Context models server-resolved facts. This is not authentication or actual controller storage.
    const fail = error => ({ok:false,error,state});
    if (!state.members.includes(context.actor)) return fail('NOT-MEMBER');
    if (context.scope!=='lounge') return fail('WRONG-SCOPE');
    if (!context.controller) return fail('OBSERVER');
    if (request.session!==state.session) return fail('SESSION');
    if (typeof request.id!=='string' || !request.id) return fail('COMMAND-ID');
    const fingerprint=JSON.stringify({actor:context.actor,session:request.session,revision:request.revision,action:request.action});
    if (Object.hasOwn(state.receipts, request.id)) return state.receipts[request.id]===fingerprint
      ? {ok:true,replayed:true,state} : fail('ID-REUSED');
    if (request.revision!==state.revision) return fail('STALE');
    if (!state.players.includes(context.actor)) return fail('WATCHER');
    if (state.result) return fail('TERMINAL');
    if (request.action.type!=='leave' && state.players[state.turn]!==context.actor) return fail('TURN');
    const next=clone(state);
    try {apply(next,context.actor,request.action,context.now??0);} catch(error) {return fail(error.message);}
    next.revision++; next.receipts[request.id]=fingerprint;
    return {ok:true,replayed:false,state:next};
  }
  return {initial,project,legal,command,chessAt};
}
