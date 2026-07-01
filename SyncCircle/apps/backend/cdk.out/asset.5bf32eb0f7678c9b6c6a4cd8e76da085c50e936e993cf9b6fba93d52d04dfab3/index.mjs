import{randomUUID as Ue}from"crypto";var p={PENDING:"pending",ACCEPTED:"accepted",REJECTED:"rejected",EXPIRED:"expired",CANCELLED:"cancelled"};var N={ACTIVE:"active",REMOVED:"removed",BLOCKED:"blocked"};var i={VALIDATION_ERROR:"VALIDATION_ERROR",UNAUTHORIZED:"UNAUTHORIZED",FORBIDDEN:"FORBIDDEN",NOT_FOUND:"NOT_FOUND",CONFLICT:"CONFLICT",RATE_LIMITED:"RATE_LIMITED",SELF_REQUEST:"SELF_REQUEST",ALREADY_FRIENDS:"ALREADY_FRIENDS",PENDING_EXISTS:"PENDING_EXISTS",TOKEN_EXPIRED:"TOKEN_EXPIRED",TOKEN_USED:"TOKEN_USED",TOKEN_INVALID:"TOKEN_INVALID",WRONG_RECIPIENT:"WRONG_RECIPIENT",INTERNAL_ERROR:"INTERNAL_ERROR"};var Z=/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;function C(e){let t=[];if(typeof e!="string"||e.trim().length===0)return t.push({field:"email",message:"Email is required"}),{valid:!1,errors:t};let n=e.trim();return n.length>254?(t.push({field:"email",message:"Email must not exceed 254 characters"}),{valid:!1,errors:t}):Z.test(n)?{valid:!0,errors:[]}:(t.push({field:"email",message:"Email format is invalid"}),{valid:!1,errors:t})}function P(e){let t=[];if(typeof e!="string"||e.trim().length===0)return t.push({field:"displayName",message:"Display name is required"}),{valid:!1,errors:t};let n=e.trim();return n.length<1?(t.push({field:"displayName",message:"Display name must be at least 1 character(s)"}),{valid:!1,errors:t}):n.length>100?(t.push({field:"displayName",message:"Display name must not exceed 100 characters"}),{valid:!1,errors:t}):{valid:!0,errors:[]}}function I(e){return e.trim().toLowerCase()}function F(e,t){return I(e)===I(t)}import{randomBytes as J,createHash as W}from"crypto";var ee=32,te=7*24*60*60*1e3;function U(){let e=J(ee).toString("hex"),t=ne(e),n=new Date(Date.now()+te).toISOString();return{token:e,tokenHash:t,expiresAt:n}}function ne(e){return W("sha256").update(e).digest("hex")}import{SESClient as ie,SendEmailCommand as oe}from"@aws-sdk/client-ses";var re=new Set(["email","normalizedemail","normalizedreceiveremail","receiveremail","recipientemail","token","tokenhash","password","secret","authorization","accesstoken","refreshtoken","idtoken"]),se="[REDACTED]";function S(e){if(e==null)return e;if(Array.isArray(e))return e.map(S);if(typeof e=="object"){let t={};for(let[n,r]of Object.entries(e))re.has(n.toLowerCase())?t[n]=se:t[n]=S(r);return t}return e}function y(e,t,n){let r={level:e,message:t,timestamp:new Date().toISOString(),...n?S(n):{}};console.log(JSON.stringify(r))}var l={info(e,t){y("info",e,t)},warn(e,t){y("warn",e,t)},error(e,t){y("error",e,t)},debug(e,t){y("debug",e,t)}};var ae=process.env.SES_SENDER_EMAIL??"noreply@synccircle.com",de=process.env.FRONTEND_BASE_URL??"https://app.synccircle.com",ce=process.env.EMAIL_ADAPTER??"",d="SyncCircle",L=7,h=null;function le(){return h||(h=new ie({})),h}function ue(e){return`${de}/invite/${e}`}function pe(e,t){return[`You've been invited to connect on ${d}!`,"",`${e} would like to add you as a friend on ${d}.`,"","Click the link below to respond to this invitation:",t,"",`This invitation link will expire in ${L} days.`,"",`If you already have a ${d} account, log in to respond.`,"If you don't have an account yet, register with this email address to accept the invitation.","",`If you don't know ${e} or don't wish to connect, you can safely ignore this email.`].join(`
`)}function me(e,t){return`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Friend Invitation - ${d}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f7; color: #333333;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f7; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background-color: #4f46e5; padding: 32px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">${d}</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 16px; font-size: 20px; color: #1a1a2e;">You've been invited to connect!</h2>
              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.5; color: #4a4a68;">
                <strong>${e}</strong> would like to add you as a friend on ${d}.
              </p>
              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto 24px;">
                <tr>
                  <td align="center" style="border-radius: 6px; background-color: #4f46e5;">
                    <a href="${t}" target="_blank" style="display: inline-block; padding: 14px 32px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 6px;">
                      View Invitation
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.5; color: #6b6b80;">
                This invitation link will expire in <strong>${L} days</strong>.
              </p>
              <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.5; color: #6b6b80;">
                If you already have a ${d} account, log in to respond. If you don't have an account yet, register with this email address to accept the invitation.
              </p>
              <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #6b6b80;">
                If you don't know ${e} or don't wish to connect, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #f9fafb; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                &copy; ${new Date().getFullYear()} ${d}. You received this email because someone invited you to connect.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`}async function O(e){let{recipientEmail:t,senderDisplayName:n,token:r}=e,c=ue(r),m=`${n} wants to connect with you on ${d}`,E=pe(n,c),g=me(n,c);if(ce.toLowerCase()==="local")return l.info("Local email adapter: invitation email composed",{recipient:t,subject:m,plainTextBody:E,htmlBody:g,invitationLink:c}),{emailSent:!0};try{let u=le(),a=new oe({Source:ae,Destination:{ToAddresses:[t]},Message:{Subject:{Data:m,Charset:"UTF-8"},Body:{Text:{Data:E,Charset:"UTF-8"},Html:{Data:g,Charset:"UTF-8"}}}});return await u.send(a),l.info("Invitation email sent successfully",{recipient:t}),{emailSent:!0}}catch(u){let a=u instanceof Error?u.message:String(u);return l.error("Failed to send invitation email via SES",{errorMessage:a,recipient:t}),{emailSent:!1}}}import{DynamoDBClient as Ee}from"@aws-sdk/client-dynamodb";import{DynamoDBDocumentClient as ge,PutCommand as tt,GetCommand as nt,QueryCommand as fe,BatchGetCommand as rt,UpdateCommand as st}from"@aws-sdk/lib-dynamodb";var Re=new Ee({}),Ie=ge.from(Re),ye=process.env.USER_PROFILES_TABLE??"UserProfiles",Ae="normalizedEmail-index";async function k(e){return(await Ie.send(new fe({TableName:ye,IndexName:Ae,KeyConditionExpression:"normalizedEmail = :email",ExpressionAttributeValues:{":email":e},Limit:1}))).Items?.[0]}import{DynamoDBDocumentClient as Ne,PutCommand as Se,GetCommand as ot,QueryCommand as q,UpdateCommand as at}from"@aws-sdk/lib-dynamodb";import{DynamoDBClient as he}from"@aws-sdk/client-dynamodb";var Te=new he({}),T=Ne.from(Te),_=process.env.FRIEND_REQUESTS_TABLE;async function H(e){await T.send(new Se({TableName:_,Item:e}))}async function M(e,t){let[n,r]=await Promise.all([T.send(new q({TableName:_,IndexName:"senderUserId-createdAt-index",KeyConditionExpression:"senderUserId = :sender",FilterExpression:"receiverUserId = :receiver AND #status = :pending",ExpressionAttributeValues:{":sender":e,":receiver":t,":pending":p.PENDING},ExpressionAttributeNames:{"#status":"status"}})),T.send(new q({TableName:_,IndexName:"senderUserId-createdAt-index",KeyConditionExpression:"senderUserId = :sender",FilterExpression:"receiverUserId = :receiver AND #status = :pending",ExpressionAttributeValues:{":sender":t,":receiver":e,":pending":p.PENDING},ExpressionAttributeNames:{"#status":"status"}}))]);return[...n.Items??[],...r.Items??[]]}import{DynamoDBDocumentClient as we,PutCommand as ut,QueryCommand as De,UpdateCommand as pt,TransactWriteCommand as mt}from"@aws-sdk/lib-dynamodb";import{DynamoDBClient as ve}from"@aws-sdk/client-dynamodb";var be=new ve({}),Ce=we.from(be),Pe=process.env.FRIENDSHIPS_TABLE,gt=process.env.FRIEND_REQUESTS_TABLE;async function V(e,t){return(await Ce.send(new De({TableName:Pe,IndexName:"userIdLow-index",KeyConditionExpression:"userIdLow = :low",FilterExpression:"userIdHigh = :high",ExpressionAttributeValues:{":low":e,":high":t}}))).Items?.[0]}function B(e,t){return e<t?{userIdLow:e,userIdHigh:t}:{userIdLow:t,userIdHigh:e}}var G={"Content-Type":"application/json","Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"Content-Type,Authorization","Access-Control-Allow-Methods":"GET,POST,PUT,DELETE,OPTIONS"};function K(e){return{statusCode:201,headers:G,body:JSON.stringify(e)}}function o(e,t,n,r){let c={error:n,code:t,...r!==void 0&&{field:r}};return{statusCode:e,headers:G,body:JSON.stringify(c)}}async function _t(e){try{let t=e.requestContext.authorizer?.claims;if(!t)return o(401,i.UNAUTHORIZED,"Missing authentication");let n=t.sub,r=t.email;if(!e.body)return o(400,i.VALIDATION_ERROR,"Request body is required");let c;try{c=JSON.parse(e.body)}catch{return o(400,i.VALIDATION_ERROR,"Invalid JSON body")}let{email:m,displayName:E,recipientEmail:g,recipientDisplayName:u}=c,a=m||g,A=E||u,w=C(a);if(!w.valid){let s=w.errors[0];return o(400,i.VALIDATION_ERROR,s.message,s.field)}let D=P(A);if(!D.valid){let s=D.errors[0];return o(400,i.VALIDATION_ERROR,s.message,s.field)}if(F(r,a))return o(400,i.SELF_REQUEST,"Cannot send a friend request to yourself");let v=I(a),f=await k(v);if(f){let{userIdLow:s,userIdHigh:Y}=B(n,f.userId),b=await V(s,Y);if(b&&b.status===N.ACTIVE)return o(409,i.ALREADY_FRIENDS,"You are already friends with this user");if((await M(n,f.userId)).length>0)return o(409,i.PENDING_EXISTS,"A pending friend request already exists between you and this user")}let{token:z,tokenHash:$,expiresAt:j}=U(),Q=new Date().toISOString(),R=Ue(),X={requestId:R,senderUserId:n,receiverUserId:f?.userId??"",receiverEmail:a,normalizedReceiverEmail:v,senderDisplayName:A,status:p.PENDING,tokenHash:$,tokenExpiresAt:j,createdAt:Q};await H(X);let x=!1;try{x=(await O({recipientEmail:a,senderDisplayName:A,token:z})).emailSent}catch(s){l.error("Failed to send invitation email",{errorMessage:s instanceof Error?s.message:String(s),requestId:R}),x=!1}return l.info("Friend request created successfully",{requestId:R}),K({requestId:R,status:p.PENDING,emailSent:x})}catch(t){return l.error("Unexpected error in createFriendRequest handler",{errorMessage:t instanceof Error?t.message:String(t)}),o(500,i.INTERNAL_ERROR,"An unexpected error occurred")}}export{_t as handler};
//# sourceMappingURL=index.mjs.map
