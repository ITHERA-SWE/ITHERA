// SOLO validación aislada. Nunca se incluye en el frontend entregado.
let session:any=null;const listeners=new Set<any>();
function control(){return (window as any).__authControl??={calls:[]}}
async function call(name:string,arg?:any){const c=control();c.calls.push({name,arg});await new Promise(r=>setTimeout(r,70));return c.error===name?new Error('Rechazo controlado del proveedor'):null}
export const supabase={auth:{
 async getSession(){return {data:{session},error:null}},
 onAuthStateChange(fn:any){listeners.add(fn);return {data:{subscription:{unsubscribe(){listeners.delete(fn)}}}}},
 async setSession(tokens:any){await call('setSession',tokens);session={...tokens,user:{id:'fixture',email:'test@example.test'}};for(const fn of listeners)fn('SIGNED_IN',session);return {data:{session},error:null}},
 async exchangeCodeForSession(code:string){await call('exchangeCodeForSession',code);session={access_token:'fixture-only-token',refresh_token:'fixture-refresh',user:{id:'fixture',email:'test@example.test'}};return {data:{session},error:null}},
 async signOut(){await call('signOut');session=null;for(const fn of listeners)fn('SIGNED_OUT',null);return {error:null}},
 async signInWithPassword(arg:any){return {data:{},error:await call('signInWithPassword',arg)}},
 async updateUser(arg:any){return {data:{user:session?.user},error:await call('updateUser',arg)}},
 async verifyOtp(arg:any){const error=await call('verifyOtp',arg);return {data:{session:error?null:{access_token:'fixture-only-token',refresh_token:'fixture-refresh',user:{id:'fixture',email:'test@example.test'}}},error}},
 async resend(arg:any){return {error:await call('resend',arg)}},
 async signInWithOAuth(arg:any){return {error:await call('signInWithOAuth',arg)}}
}};
