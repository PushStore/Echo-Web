import { C } from "../theme.js";
import EchoLogo from "../components/EchoLogo.jsx";

export default function NotificationsScreen() {
  return (
    <div style={{flex:1, overflowY:"auto"}}>
      <div style={{position:"sticky",top:0,background:C.bg,padding:"14px",borderBottom:`1px solid ${C.border}`}}>
        <h2 style={{color:C.text,fontSize:20,fontWeight:800,margin:0}}>Notifications</h2>
      </div>
      <div style={{padding:48,textAlign:"center",display:"flex",flexDirection:"column",alignItems:"center",gap:14}}>
        <EchoLogo size={40}/>
        <p style={{color:C.muted,fontSize:15,margin:0}}>No notifications yet.</p>
      </div>
    </div>
  );
}
