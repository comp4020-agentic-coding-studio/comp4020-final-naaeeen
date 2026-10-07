import ctypes,ctypes.util,os,resource,sys
resource.setrlimit(resource.RLIMIT_CORE,(0,0))
libc=ctypes.CDLL(None,use_errno=True)
if libc.prctl(38,1,0,0,0)!=0: raise OSError(ctypes.get_errno(),'PR_SET_NO_NEW_PRIVS')
seccomp=ctypes.CDLL(ctypes.util.find_library('seccomp'),use_errno=True)
seccomp.seccomp_init.argtypes=[ctypes.c_uint32];seccomp.seccomp_init.restype=ctypes.c_void_p
seccomp.seccomp_syscall_resolve_name.argtypes=[ctypes.c_char_p];seccomp.seccomp_syscall_resolve_name.restype=ctypes.c_int
seccomp.seccomp_rule_add.argtypes=[ctypes.c_void_p,ctypes.c_uint32,ctypes.c_int,ctypes.c_uint];seccomp.seccomp_rule_add.restype=ctypes.c_int
seccomp.seccomp_load.argtypes=[ctypes.c_void_p];seccomp.seccomp_load.restype=ctypes.c_int
seccomp.seccomp_release.argtypes=[ctypes.c_void_p]
context=seccomp.seccomp_init(0x7fff0000)
assert context
syscall=seccomp.seccomp_syscall_resolve_name(b'clone3'); assert syscall>=0
assert seccomp.seccomp_rule_add(context,0x00050000|int(sys.argv[1]),syscall,0)==0
assert seccomp.seccomp_load(context)==0
seccomp.seccomp_release(context)
os.execve(sys.argv[2],[sys.argv[2],'-e',"console.log(JSON.stringify({version:process.version,status:'STARTED'}))"],{'PATH':'/usr/bin:/bin','HOME':'/tmp'})
