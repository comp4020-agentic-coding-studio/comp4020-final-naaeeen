# Landscape chat refinement: declared affected recheck

The fresh parent-owned review found that native-final-v2 checked chat close,
input and send targets but omitted transcript visibility. Its landscape PNG shows
the representative message almost entirely clipped. The v2 artifact/result stays
unchanged; its chat acceptance was incomplete.

Before the affected recheck: change only the max-height500/min-width701landscape
chat CSS. Input and Send share a grid row; label/footer are compact; the message
list has at least80CSSpx. All form targets remain at least44px. The original SVG,
piece catalogue, captions, board rules and tray factor are frozen.

Recheck the same mixed task for both844x390tray modes. Add list clientHeight and
actual author/body text range bounds, plus the full representative message box,
inside the list clip. Reject a clipped first message or list below80px; preserve
native chat PNGs, source hashes, input/state checks and process closure. Desktop
and portrait source behavior is outside this CSS media rule; their earlier v2
checks remain bound to their original source. No human/screen-reader claim.


The first affected v3recheck passed with a98pxlist and a complete57pxmessage.
A further affected two-case run will add original-protocol, preserved-amendment
and this chat-patch criterion hashes at entry and exit, with exact entry copies.
This is a grader/provenance refinement; it does not change the UI again. V2gets an
explicit retrospective amendment association, never a claimed runtime binding.
