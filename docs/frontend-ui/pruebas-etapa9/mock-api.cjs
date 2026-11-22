// Fixtures aislados: no se distribuyen en el frontend ni llaman a proveedores reales.
const http=require('http');
const {Server}=require(process.env.ITHERA_REPO_ROOT+'/backend/node_modules/socket.io');
let documents=[],removed=false,requestDone=false;let scenario='normal';let requests=[];let proposals=[];let comments=[];let votes={};let activities=[];let links=[];let slots=[];
const doc=(id,owner='fixture',immutable=false)=>({id,trip_id:'41',user_id:owner,file_name:id==='d3'?'Comprobante simulado.pdf':id==='d4'?'Archivo nuevo.pdf':'Reserva '+id+'.pdf',file_path:'fixture/'+id,file_url:'https://fixture.test/file/'+id+'?token=exact%26signature&expires=42',mime_type:'application/pdf',file_size:1024,category:'vuelo',metadata:{notes:'Nota existente',immutable,...(immutable?{receipt_folio:'SIM-1'}:{})},created_at:'2026-11-21T12:00:00Z'});
let documentUploadCount=0;let chatMessages=[];let notificationRecords=[];const user={id_usuario:'1',auth_user_id:'fixture',email:'test@example.test',nombre:'Viajera de prueba',proveedor_auth:'email'};
const group=(id='41')=>({id,nombre:id==='41'?'Viaje de validación':'Segundo viaje',destino:id==='41'?'Cancún':'Oaxaca',destino_formatted_address:id==='41'?'Cancún, México':'Oaxaca, México',destino_latitud:21,destino_longitud:-86,destino_place_id:'fixture-place',fecha_inicio:'2027-03-12',fecha_fin:'2027-03-18',estado:scenario==='readonly'?'finalizado':'activo',presupuesto_total:50000,codigo_invitacion:'FIXTURE',myRole:scenario==='traveler'?'viajero':'admin',memberCount:2,es_publico:false,maximo_miembros:scenario==='capacity'?2:10,modulo_itinerario_bloqueado:scenario==='locked'});
const slice=(origin,destination,departureAt,arrivalAt,stops=0)=>({origin,destination,departureAt,arrivalAt,originName:'Aeropuerto de pruebas',destinationName:'Aeropuerto de pruebas',duration:'PT2H',stops,segments:[]});
const flight=(id,price=3000,currency='MXN',stops=0)=>({id,provider:'duffel',liveMode:id!=='f1',airline:id==='f3'?'Proveedor B':'Proveedor A',airlineCode:'FX',flightNumber:id,origin:'MEX',destination:'CUN',originName:'Ciudad de México',destinationName:'Cancún',departureAt:'2027-03-12T10:00:00-06:00',arrivalAt:'2027-03-12T12:00:00-05:00',duration:'PT2H',stops,price:scenario==='missing'&&id==='f1'?null:price,currency,cabinClass:'economy',fareBrand:'Tarifa informada',aircraft:null,baggage:[{type:'checked',quantity:1}],passengers:{adults:1,children:0,infantsWithoutSeat:0,total:1},outboundSlice:slice('MEX','CUN','2027-03-12T10:00:00','2027-03-12T12:00:00',stops),returnSlice:slice('CUN','MEX','2027-03-18T15:00:00','2027-03-18T17:00:00',id==='f1'?1:0),slices:[],raw:{}});
const room={rateId:'r1',roomTypeId:'rt',offerId:'rate-1',name:'Habitación informada',boardName:'Plan informado',boardType:null,refundableTag:'Condición del proveedor',maxOccupancy:3,adultCount:2,childCount:1,price:2000,currency:'MXN',suggestedSellingPrice:null,taxesAndFees:[],cancellationPolicies:null,paymentTypes:[]};
const hotel=(id,price=2000,currency='MXN',rating=4.3)=>({id,hotelId:id,provider:'liteapi',supplier:'Proveedor de prueba',supplierId:1,name:`Estancia ${id}`,address:'Dirección de validación',city:'Cancún',country:'México',latitude:21,longitude:-86,rating,googleRating:rating,googlePlaceId:null,googleUserRatingCount:rating?12:null,photoName:null,photoUrl:id==='h2'?null:'https://fixture.test/hotel.jpg',checkIn:'2027-03-12',checkOut:'2027-03-18',nights:6,price,currency,offerId:`offer-${id}`,roomName:'Habitación informada',boardName:'Plan informado',refundableTag:null,rooms:[room],rateCount:1,priceMin:price,priceMax:price,raw:{}});
const summary={totalBudget:50000,committed:0,available:50000,percentCommitted:0,categoryTotals:{transporte:0,hospedaje:0,actividad:0,comida:0,otro:0}};
const members=()=>[{id:'1',usuario_id:'1',nombre:'Viajera de prueba',email:'test@example.test',rol:scenario==='traveler'?'viajero':'admin'},...(removed?[]:[{id:'2',usuario_id:'2',nombre:'Otra persona',email:'two@example.test',rol:'viajero'}])];

function seed(){proposals=[
 {id:'101',grupo_id:'41',tipo_item:'vuelo',titulo:'Vuelo prueba MXN',estado:'en_votacion',creado_por:'1',detalle:{aerolinea:'Proveedor A',origen_codigo:'MEX',destino_codigo:'CUN',salida:'2027-03-12T10:00:00',llegada:'2027-03-12T12:00:00',duracion:'PT2H',escalas:0,precio:3000,moneda:'MXN',payload:{normalizedOffer:flight('f1')}}},
 {id:'102',grupo_id:'41',tipo_item:'vuelo',titulo:'Vuelo prueba USD',estado:'aprobada',creado_por:'2',detalle:{aerolinea:'Proveedor B',precio:100,moneda:'USD'}},
 {id:'103',grupo_id:'41',tipo_item:'hospedaje',titulo:'Hotel prueba',estado:'aprobada',creado_por:'2',detalle:{nombre:'Hotel prueba',precio_total:9000,moneda:'MXN',check_in:'2027-03-12',check_out:'2027-03-18',payload:{normalizedHotel:hotel('h1')}}},
 {id:'104',grupo_id:'41',tipo_item:'actividad',titulo:'Paseo del grupo',estado:'pendiente',creado_por:'2'}];
 comments=[{id:'c1',id_propuesta:'101',id_usuario:'1',nombre:'Viajera de prueba',contenido:'Comentario inicial',created_at:'2026-11-21T14:00:00Z'},{id:'c2',id_propuesta:'101',id_usuario:'2',nombre:'Otra persona',contenido:'Otra opinión',created_at:'2026-11-21T15:00:00Z'}];votes={};}


const agendaItem=(id,title,time,extra={})=>({id,title,time,description:'Descripción de prueba',category:'actividad',status:'pendiente',price:0,currency:'MXN',image:'',createdBy:'1',startsAt:time==='Hora pendiente'?null:`2027-03-12T${time}:00-06:00`,endsAt:time==='Hora pendiente'?null:`2027-03-12T${time}:00-06:00`,...extra});
const place={id:'place-test',name:'Museo de prueba',formattedAddress:'Dirección del lugar de prueba',latitude:21.1,longitude:-86.1,photoUrl:null,primaryCategory:'Museo'};
function seedAgenda(){slots=[];activities=[agendaItem('a1','Visita confirmada','10:00',{status:'confirmada',proposalId:'201',location:'Dirección existente',latitude:21,longitude:-86,endsAt:'2027-03-12T11:30:00-06:00'}),agendaItem('a2','Idea de otra persona','14:00',{createdBy:'2',proposalId:'202'}),agendaItem('a3','Mi propuesta','10:30',{proposalId:'203',endsAt:'2027-03-12T12:00:00-06:00'}),agendaItem('a4','Plan sin horario','Hora pendiente',{location:'Ubicación textual'})];
 for(const a of activities.filter(a=>a.proposalId))proposals.push({id:a.proposalId,grupo_id:'41',tipo_item:'actividad',titulo:a.title,estado:a.status==='confirmada'?'aprobada':'pendiente',creado_por:a.createdBy});
 links=[{id:'link1',entityA:{type:'activity',id:'a1',label:'Visita confirmada'},entityB:{type:'expense',id:'e1',label:'Entrada existente'}}];}
const dateOnly=offset=>{const d=new Date();const s=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Mexico_City',year:'numeric',month:'2-digit',day:'2-digit'}).format(d);const day=new Date(s+'T12:00:00Z');day.setUTCDate(day.getUTCDate()+offset);return day.toISOString().slice(0,10)};
function gallery(){return [
 {rol:'viajero',grupos_viaje:{...group('41'),nombre:'En curso real',fecha_inicio:dateOnly(-1),fecha_fin:dateOnly(1),memberCount:3,destino_photo_url:'https://fixture.test/destination.jpg'}},
 {rol:'admin',grupos_viaje:{...group('42'),nombre:'Próximo destino',fecha_inicio:dateOnly(7),fecha_fin:dateOnly(10)}},
 {rol:'viajero',grupos_viaje:{...group('43'),nombre:'Fechas por acordar',fecha_inicio:null,fecha_fin:null,memberCount:null}},
 {rol:'viajero',grupos_viaje:{...group('44'),nombre:'Recuerdo compartido',estado:'archivado',fecha_inicio:dateOnly(-10),fecha_fin:dateOnly(-6)}},
 {rol:'admin',grupos_viaje:{...group('45'),nombre:'Finalizado con fechas futuras',estado:'finalizado',fecha_inicio:dateOnly(20),fecha_fin:dateOnly(22)}}
]}
async function handler(req,res){
 res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Access-Control-Allow-Headers','*');res.setHeader('Access-Control-Allow-Methods','*');if(req.method==='OPTIONS'){res.writeHead(204);return res.end()}
 const url=new URL(req.url,'http://127.0.0.1:3009');const path=url.pathname;let body='';for await(const part of req)body+=part;let payload;try{payload=body?JSON.parse(body):null}catch{payload=body}
 requests.push({method:req.method,path,query:Object.fromEntries(url.searchParams),body:payload});let data={ok:true};let status=200;
 if(path==='/api/auth/login'){await new Promise(r=>setTimeout(r,120));if(scenario==='login-error'){status=401;data={ok:false,error:'Credenciales no válidas'}}else data={ok:true,session:{access_token:'fixture-only-token'},user:{id:'fixture',email:payload.email}}}
 else if(path==='/api/auth/register'){data={ok:true,data:{session:null,user:{id:'fixture'}}}}
 else if(path==='/api/auth/forgot-password'){if(scenario==='forgot-error')status=503;data={ok:status===200,message:'Solicitud recibida'}}
 else if(path==='/api/auth/email-availability')data={ok:true,available:scenario!=='email-taken'};
 else if(path==='/api/auth/me/stats')data={ok:true,stats:{totalTrips:2,activeTrips:1,pastTrips:1,totalActivities:0,totalBudget:3000,totalSpent:100,countriesVisited:1}};
 else if(path==='/api/notifications/preferences'){if(scenario==='pref-error')status=503;data.preferences={notificaciones_correo:true,grupo:true,votos:true,finanzas:true,vuelos:true,hospedajes:true,...(payload||{})}}
 else if(path==='/api/auth/me'&&req.method==='PATCH'){await new Promise(r=>setTimeout(r,100));if(scenario==='profile-error')status=503;else user.nombre=payload.nombre;data.user=user}
 else if(path==='/api/auth/me/avatar'){await new Promise(r=>setTimeout(r,100));if(scenario==='avatar-error')status=503;else user.avatar_url=req.method==='DELETE'?null:'https://fixture.test/avatar.jpg';data.user=user}
 else if(path==='/api/auth/sync-user' ||path==='/api/auth/me')data.user=user;
 else if(path==='/api/groups/my-history'){
  const items=gallery();data={ok:true,activos:scenario==='history-empty'?[]:scenario==='gallery'||scenario==='history-stale'?items.filter(i=>i.grupos_viaje.estado==='activo'):[{rol:group().myRole,grupos_viaje:group()},{rol:'admin',grupos_viaje:group('42')}],pasados:scenario==='gallery'?items.filter(i=>i.grupos_viaje.estado!=='activo'):[]};if(scenario==='history-error')status=503;if(scenario==='history-stale')await new Promise(r=>setTimeout(r,800));
 }
 else if(path==='/api/groups'&&req.method==='POST'){
  await new Promise(r=>setTimeout(r,120));if(scenario==='create-trip-error'){status=503;data={ok:false,error:'No se pudo crear el viaje de prueba.'}}else if(scenario==='duplicate-name'){status=409;data={ok:false,error:'Ya tienes un viaje con ese nombre.',code:'DUPLICATE_TRIP_NAME'}}else data.group={...group('77'),id:'77',nombre:payload.nombre,destino:payload.destino,fecha_inicio:payload.fecha_inicio,fecha_fin:payload.fecha_fin,codigo_invitacion:'NEWTRIP7',myRole:'admin'}
 }
 else if(/\/groups\/[^/]+\/invitations$/.test(path)&&req.method==='POST'){
  await new Promise(r=>setTimeout(r,100));if(scenario==='invitation-send-error'){status=503;data={ok:false,error:'No se pudieron confirmar las invitaciones de prueba.'}}else data={ok:true,message:'Resultado de invitaciones',groupId:path.split('/')[3],codigo:'NEWTRIP7',invitations:payload.emails.map((email,i)=>({id:String(i),email,status:email.startsWith('already')?'already_invited':email.startsWith('member')?'existing_member':'created',codigo:'NEWTRIP7'}))}
 }
 else if(path.startsWith('/api/groups/invite-preview/')){
  const code=path.split('/').pop();if(code==='INVALID'){status=404;data={ok:false,error:'Invitación no encontrada o grupo inactivo'}}else if(code==='USED'){status=410;data={ok:false,error:'Esta invitación personal ya fue usada, revocada o no es válida.',code:'EMAIL_INVITE_INVALID'}}else if(scenario==='preview-error'){status=503;data={ok:false,error:'Servicio de invitaciones temporalmente no disponible'}}else{data.preview={groupId:code==='SECOND'?'42':'41',nombre:code==='SECOND'?'Segundo viaje invitado':'Viaje por invitación',descripcion:'Descripción autorizada del preview',destino:'Cancún',fecha_inicio:'2027-03-12',fecha_fin:'2027-03-18',estado:'activo',codigo:code,memberCount:code==='FULL'?2:1,maximo_miembros:2,canJoin:code!=='FULL',cannotJoinReason:code==='FULL'?'GROUP_CAPACITY_REACHED':null,requiresApproval:code==='PRIVATE',emailInvitation:Boolean(url.searchParams.get('token')),invitedEmail:url.searchParams.get('token')?'test@example.test':null};if(scenario==='preview-slow')await new Promise(r=>setTimeout(r,700))}
 }
 else if(path==='/api/groups/join'&&req.method==='POST'){
  await new Promise(r=>setTimeout(r,100));if(scenario==='join-pending-existing'){status=409;data={ok:false,error:'Tu solicitud está pendiente de aprobación.',code:'JOIN_REQUEST_PENDING'}}else if(scenario==='join-error'){status=403;data={ok:false,error:'El correo no coincide con el invitado.'}}else if(scenario==='join-already'){status=409;data={ok:false,error:'El usuario ya pertenece a este grupo'}}else{data.message=payload.codigo==='PRIVATE'?'Solicitud enviada al organizador.':'Incorporación confirmada por el servidor.';data.group={...group(payload.codigo==='SECOND'?'42':'41'),myRole:payload.codigo==='PRIVATE'?'pendiente_aprobacion':'viajero',requiresApproval:payload.codigo==='PRIVATE',codigo_invitacion:payload.codigo}}
 }
 else if(/\/groups\/members\/[^/]+\/role$/.test(path)){await new Promise(r=>setTimeout(r,120));data.member={pendingDelegation:true}}
 else if(/\/groups\/[^/]+\/members\/[^/]+$/.test(path)&&req.method==='DELETE'){removed=true}
 else if(path.endsWith('/admin-delegations'))data.requests=[];
 else if(/\/join-requests\/[^/]+$/.test(path)){requestDone=true}
 else if(path.endsWith('/join-requests'))data.requests=requestDone?[]:[{id:'jr1',usuario_id:'3',nombre:'Solicitante real',email:'join@example.test',estado:'pendiente',created_at:'2026-11-21T12:00:00Z'}];
 else if(path.endsWith('/invitations')&&req.method==='GET')data.invitations=[{id:'inv1',email:'pending@example.test',estado:'pendiente',created_at:'2026-11-21T12:00:00Z'}];
 else if(path.endsWith('/invite-settings')){data.inviteSettings={expiresAt:null,maxUses:payload.maxUses,usedCount:0}}
 else if(path.endsWith('/invite'))data={ok:true,inviteLink:'http://127.0.0.1:5173/join-group?code=FIXTURE',inviteSettings:{expiresAt:null,maxUses:null,usedCount:0}};
 else if(path.endsWith('/qr'))data.qrBase64='data:image/png;base64,ZmFrZQ==';
 else if(/^\/api\/documents\/[^/]+(?:\/[^/]+)?$/.test(path)){
   if(scenario==='documents-error'){status=503;data={ok:false,error:'Documentos temporalmente no disponibles'}}else if(req.method==='GET')data.documents=scenario==='documents-empty'?[]:scenario==='document-snapshot-duplicates'?[...documents,documents[0]]:documents;
   else if(req.method==='DELETE'){await new Promise(r=>setTimeout(r,100));documents=documents.filter(d=>d.id!==path.split('/').pop())}
   else if(req.method==='POST'){documentUploadCount++;const created=doc('d4');documents.push(created);if(scenario==='document-race'){io.emit('dashboard_updated',{grupoId:41,tipo:'documento_creado'});await new Promise(r=>setTimeout(r,600))}else await new Promise(r=>setTimeout(r,100));data.document=created}
 }
 else if(/^\/api\/groups\/[^/]+$/.test(path)){if(scenario==='group-slow')await new Promise(r=>setTimeout(r,600));data.group=group(path.split('/').pop());if(req.method==='PATCH'){if(scenario==='settings-error')status=503;data.group={...data.group,...payload}};if(scenario==='group-error')status=403}

 else if(/^\/api\/proposals\/groups\/[^/]+\/vote-results$/.test(path)){
  if(scenario==='votes-error')status=503;
  data.results=proposals.map(p=>({id_propuesta:p.id,tipo_item:p.tipo_item,titulo:p.titulo,votos:votes[p.id]?1:0,votos_a_favor:votes[p.id]==='a_favor'?1:0,votos_en_contra:votes[p.id]==='en_contra'?1:0,abstenciones:votes[p.id]==='abstencion'?1:0,votos_pendientes:votes[p.id]?1:2,requiere_desempate_admin:false,estado_actual:p.estado,mi_voto:votes[p.id]||null}));
 }
 else if(/^\/api\/proposals\/groups\/[^/]+\/[^/]+\/comments(?:\/[^/]+)?$/.test(path)){
  const parts=path.split('/'),id=parts[5],cid=parts[7];if(scenario==='comments-error')status=503;
  if(req.method==='GET')data.comments=comments.filter(c=>c.id_propuesta===id);
  else if(status===200){if(req.method==='POST'){const c={id:'c'+(comments.length+1),id_propuesta:id,id_usuario:'1',nombre:'Viajera de prueba',contenido:payload.contenido,created_at:'2026-11-21T16:00:00Z'};comments.push(c);data.comment=c}
  else if(req.method==='PATCH'){const c=comments.find(c=>c.id===cid);c.contenido=payload.contenido;data.comment=c}
  else if(req.method==='DELETE')comments=comments.filter(c=>c.id!==cid)}
 }
 else if(path.endsWith('/vote')){await new Promise(r=>setTimeout(r,90));if(scenario==='vote-error')status=503;else{const id=path.split('/')[5];votes[id]=payload.voto;if(scenario==='auto-approve')proposals.find(p=>p.id===id).estado='aprobada'}}
 else if(path.endsWith('/admin-decision')){if(scenario==='decision-error')status=503;else proposals.find(p=>p.id===path.split('/')[5]).estado=payload.decision==='aprobar'?'aprobada':'descartada'}
 else if(/^\/api\/proposals\/[^/]+$/.test(path)){
  const id=path.split('/').pop(),p=proposals.find(p=>p.id===id);if(!p)status=404;else if(req.method==='DELETE')proposals=proposals.filter(p=>p.id!==id);else{if(req.method==='PUT')Object.assign(p,payload);data.proposal=p}
 }
 else if(path.startsWith('/api/checkout/')){await new Promise(r=>setTimeout(r,90));if(scenario==='checkout-error')status=503;else{const p=proposals.find(p=>p.id===path.split('/')[4]);p.detalle[path.includes('/hotel/')?'reserva_estado':'compra_estado']='confirmada_simulada';data.data={folio:'SIM-FIXTURE-101',status:'confirmada_simulada',document:{id:'doc1',file_name:'comprobante.pdf',file_url:'https://fixture.test/receipt.pdf'},expense:scenario==='no-expense'?null:{id:'expense1'},payment:{approved:true,status:'simulated',message:'Operación simulada de prueba'}}}}

 else if(path.endsWith('/itinerary/subgroups/schedule')){data.slots=slots;data.myUserId=1}
 else if(path.endsWith('/itinerary/subgroups/slots')&&req.method==='POST'){const slot={id:11,group_id:41,title:payload.title,starts_at:payload.starts_at,ends_at:payload.ends_at,created_by:1,subgroups:[],memberships:[]};slots.push(slot);data.slot=slot}
 else if(path.endsWith('/itinerary/activities') || /\/itinerary\/activities\/[^/]+$/.test(path)){
  if(scenario==='create-error'||scenario==='edit-error'||scenario==='delete-error')status=503;
  if(scenario==='conflict')status=409;
  if(req.method==='POST')await new Promise(r=>setTimeout(r,120));
  if(status===200){if(req.method==='DELETE')activities=activities.filter(a=>a.id!==path.split('/').pop());else{
   const id=req.method==='POST'?'a'+(activities.length+1):path.split('/').pop();const old=activities.find(a=>a.id===id);
   const item={...old,...agendaItem(id,payload.titulo,payload.fecha_inicio?.slice(11,16)||'Hora pendiente'),description:payload.descripcion||'',location:payload.ubicacion||'',latitude:payload.latitud,longitude:payload.longitud,startsAt:payload.fecha_inicio,endsAt:payload.fecha_fin,externalReference:payload.referencia_externa,proposalId:old?.proposalId||'new-'+id,dayNumber:payload.payload?.selectedDayNumber||1};
   if(old)Object.assign(old,item);else activities.push(item);data.activity={id_actividad:id,propuesta_id:item.proposalId};
  }}
 }
 else if(path.endsWith('/itinerary')){if(scenario==='itinerary-error')status=503;if(scenario==='slow-agenda')await new Promise(r=>setTimeout(r,800));data.days=scenario==='no-calendar'?[]:[1,2,3].map(n=>({dayNumber:n,date:`${11+n} de marzo de 2027`,activities:path.includes('/42/')?[]:activities.filter(a=>(a.dayNumber||1)===n)}));data.itinerary={id:'fixture'};}
 else if(path==='/api/maps/places/text-search'){if(scenario==='google-down')status=503;if(scenario==='slow-search')await new Promise(r=>setTimeout(r,800));data.data=scenario==='place-empty'?[]:[{...place,rating:4.5,userRatingCount:12,primaryCategory:'museum',regularOpeningHours:{weekdayDescriptions:['viernes: 09:00–18:00']},editorialSummary:'Resumen recibido del proveedor'}, {...place,id:'park',name:'Parque de prueba',latitude:21.2,longitude:-86.1,rating:null,userRatingCount:null,primaryCategory:'park',photoUrl:'https://fixture.test/photo.jpg'}, {...place,id:'unknown',name:'Lugar sin coordenadas',latitude:null,longitude:null,rating:0,userRatingCount:0}, {...place,id:'far',name:'Lugar lejano',latitude:40,longitude:0}]}
 else if(path.startsWith('/api/maps/places/details/')){if(scenario==='details-error')status=503;data.data={...place,regularOpeningHours:{weekdayDescriptions:['viernes: 09:00–18:00']},rating:4.5,userRatingCount:12};}
 else if(path==='/api/maps/places/autocomplete'){if(scenario==='autocomplete-error')status=503;data.data=scenario==='suggestions'?[{placeId:'place-test',description:'Museo de prueba, México',mainText:'Museo de prueba',secondaryText:'México'}]:[]}
 else if(path==='/api/maps/geocoding/search'){if(scenario==='geocode-error')status=503;data.data=(scenario==='geocode-empty'||scenario==='context-unresolved')?null:{formattedAddress:url.searchParams.get('address'),latitude:21.1,longitude:-86.1}}
 else if(path==='/api/maps/routes/compute'){if(scenario==='route-error'||scenario==='google-down')status=503;data.data=scenario==='route-empty'?null:{distanceText:'2 km',durationText:'10 min',duration:'600s',distanceMeters:2000,encodedPolyline:scenario==='route-fallback'?null:'_p~iF~ps|U_ulLnnqC_mqNvxq`@',steps:[{instructions:'Gira <b>derecha</b>',distanceText:'1 km',durationText:'5 min'}]}}
 else if(path==='/api/maps/weather'){if(scenario==='weather-error')status=503;if(scenario==='weather-slow')await new Promise(r=>setTimeout(r,800));data.data=scenario==='weather-empty'?null:{current:{temperature:null,windSpeed:0,relativeHumidity:null,precipitationProbability:20,weatherCode:0,icon:'🌤',description:null},forecast:[{date:'2026-11-22',min:0,max:22,precipitationProbability:null,weatherCode:1000,icon:'☀',description:'Condición de prueba'},{date:'2026-11-23',min:null,max:null,precipitationProbability:0,weatherCode:0,description:null}]}}
 else if(path.endsWith('/context-links/options')){if(scenario==='context-error')status=503;data.options={expenses:[{type:'expense',id:'e1',label:'Entrada existente',amount:100,description:'Entrada existente',createdAt:'2026-11-21T00:00:00Z'}],documents:[{type:'document',id:'d1',label:'Documento existente'}],activities:[],subgroupActivities:[]}}
 else if(/\/context-links(?:\/[^/]+)?$/.test(path)){if(scenario==='links-error'&&req.method==='POST')status=503;if(req.method==='GET')data.links=url.searchParams.get('entityId')?links.filter(l=>l.entityA.id===url.searchParams.get('entityId')):links;else if(status===200&&req.method==='POST'){links.push({id:'link'+(links.length+1),entityA:payload.source,entityB:payload.target});data.link=links.at(-1)}else if(req.method==='DELETE')links=links.filter(l=>l.id!==path.split('/').pop())}
 else if(path.startsWith('/api/export/share-link/')){if(scenario==='share-error')status=503;data.shareUrl='http://127.0.0.1:5173/shared/fixture-token';data.expiresAt='2026-11-28T12:00:00Z';data.token='fixture-token'}
 else if(path.startsWith('/api/export/shared/')){if(scenario==='share-expired')status=410;data.group=group();data.itinerary=[{id:1,title:'Actividad compartida',startsAt:'2027-03-12T16:00:00Z',endsAt:null,day:'2027-03-12',status:'confirmada'}];data.tokenMeta={expiresAt:'2026-11-28T12:00:00Z'}}
 else if(path.includes('/airports/')){if(scenario==='google-down')status=503;const query=url.searchParams.get('q')||'CUN';const code=query.toUpperCase()==='MEX'?'MEX':query.toLowerCase().includes('oaxaca')?'OAX':'CUN';const option={code,name:'Aeropuerto de pruebas',city:code==='MEX'?'Ciudad de México':'Cancún',country:'México',countryCode:'MX',latitude:21,longitude:-86,label:code,matchSource:'catalog',score:1};data.data=path.endsWith('/resolve')?option:[option]}
 else if(path==='/api/flights/search'){if(scenario==='flight-error')status=503;if(scenario==='slow')await new Promise(r=>setTimeout(r,800));data.data=scenario==='empty'?[]:[flight('f1',3000),flight('f2',4000),flight('f3',100,'USD',1)]}
 else if(path==='/api/hotels/search'){if(scenario==='hotel-error')status=503;data.data=scenario==='empty'?[]:[hotel('h1'),hotel('h2',3000,'MXN',null),hotel('h3',100,'USD',4.7)]}
 else if(path==='/api/hotels/prebook'){if(scenario==='prebook-error')status=503;data.data={prebookId:'fixture-prebook'}}
 else if(path==='/api/proposals/flights'||path==='/api/proposals/hotels'){
  if(scenario==='save-error')status=503;
  const p={id:String(100+proposals.length),grupo_id:payload.grupoId,tipo_item:path.endsWith('flights')?'vuelo':'hospedaje',titulo:payload.titulo,descripcion:payload.descripcion,estado:'pendiente',creado_por:'1',payload:payload.payload,detalle:payload.vuelo||payload.hospedaje};if(status===200)proposals.push(p);data.proposal=p;
 }
 else if(path==='/api/search-history'){if(scenario==='history-error'&&req.method==='POST')status=503;data.data=[]}
 else if(path.endsWith('/itinerary'))data={ok:true,itinerary:{},days:[{dayNumber:1,date:'12 de marzo de 2027',activities:[]}]};
 else if(path.endsWith('/members')){if(scenario==='people-slow'||path.includes('/43/'))await new Promise(r=>setTimeout(r,700));data.members=members()}
 else if(path.endsWith('/vote-results'))data.results=[];
 else if(/^\/api\/proposals\/groups\/[^/]+$/.test(path)){const all=path.endsWith('/42')?[]:proposals;if(scenario==='all-proposals'){data.data=[...all,{id_propuesta:'501',grupo_id:41,tipo_item:'actividad',titulo:'Lugar guardado',estado:'rechazada',creado_por:1,payload:{googlePlaceId:'real-place',place:{id:'real-place',formattedAddress:'Ubicación guardada'}}},{id_propuesta:'502',grupo_id:41,tipo_item:'otro',titulo:'Alternativa archivada',estado:'archivada',creado_por:1}]}else data.proposals=all;}
 else if(path.endsWith('/budget'))data={ok:true,groupId:'41',myRole:'admin',summary,members:members(),expenses:[],balances:{},settlements:[],paymentHistory:[]};
 else if(path.endsWith('/travel-context'))data.data={startLocation:scenario==='context-unresolved'?{source:'hospedaje_reservado',label:'Hospedaje sin coordenadas',latitude:null,longitude:null}:null};
 else if(path.endsWith('/context-links/options'))data.options={expenses:[],documents:[],activities:[],subgroupActivities:[]};
 else if(path.endsWith('/context-links'))data.links=[];
 else if(path.endsWith('/schedule'))data.slots=[];
 else if(path.endsWith('/notifications')){if(scenario==='notifications-error')status=503;data.notifications=notificationRecords;}
 else if(path.endsWith('/unread-count'))data.count=notificationRecords.filter(n=>!n.leida).length;
 else if(path.endsWith('/chat/messages')){if(scenario==='chat-error')status=503;data.messages=chatMessages;}
 else {status=404;console.log('NO IMPLEMENTADO',req.method,path)}
 if(status!==200&&!data.error)data={ok:false,error:'Fallo controlado de validación'};
 res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(data));
}
const server=http.createServer((req,res)=>handler(req,res).catch(error=>{console.error(error);res.writeHead(500);res.end()}));
const io=new Server(server,{cors:{origin:'*'}});io.on('connection',socket=>socket.onAny((event,...args)=>{const cb=args.at(-1);if(event==='chat_send_message'||event==='subgroup_chat_send_message'){const payload=args[0];requests.push({method:'SOCKET',path:event,body:payload});const msg={id:'message-'+(chatMessages.length+1),...payload,userId:'1',authorName:'Viajera de prueba',createdAt:'2026-11-22T18:00:00Z'};chatMessages.push(msg);setTimeout(()=>{io.emit(event==='chat_send_message'?'chat_message':'subgroup_chat_message',msg);if(typeof cb==='function')cb({ok:true,message:msg})},80)}else if(typeof cb==='function')cb({ok:true})}));
server.listen(3009,'127.0.0.1');
module.exports={get requests(){return requests},get proposals(){return proposals},scenario(name){scenario=name},reset(name='normal'){scenario=name;documentUploadCount=0;chatMessages=[];notificationRecords=[];documents=[doc('d1'),doc('d2','other-auth'),doc('d3','fixture',true)];removed=false;requestDone=false;user.nombre='Viajera de prueba';requests=[];proposals=[];comments=[];votes={};if(!name.startsWith('search-'))seed();if(name==='empty')proposals=[];seedAgenda()},emit(event,payload){if(event==='notification_created'&&!notificationRecords.some(n=>n.id===payload.id))notificationRecords.push(payload);io.emit(event,payload)},appendComment(c){comments.push(c)},get activities(){return activities},group};
