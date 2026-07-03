import{DynamoDBClient as T}from"@aws-sdk/client-dynamodb";import{DynamoDBDocumentClient as A,GetCommand as D}from"@aws-sdk/lib-dynamodb";import{SESClient as h,SendEmailCommand as N}from"@aws-sdk/client-ses";var d={VALIDATION_ERROR:"VALIDATION_ERROR",UNAUTHORIZED:"UNAUTHORIZED",FORBIDDEN:"FORBIDDEN",NOT_FOUND:"NOT_FOUND",CONFLICT:"CONFLICT",RATE_LIMITED:"RATE_LIMITED",SELF_REQUEST:"SELF_REQUEST",ALREADY_FRIENDS:"ALREADY_FRIENDS",PENDING_EXISTS:"PENDING_EXISTS",TOKEN_EXPIRED:"TOKEN_EXPIRED",TOKEN_USED:"TOKEN_USED",TOKEN_INVALID:"TOKEN_INVALID",WRONG_RECIPIENT:"WRONG_RECIPIENT",INTERNAL_ERROR:"INTERNAL_ERROR"};var E={"Content-Type":"application/json","Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"Content-Type,Authorization","Access-Control-Allow-Methods":"GET,POST,PUT,DELETE,OPTIONS"};function R(e){return{statusCode:200,headers:E,body:JSON.stringify(e)}}function c(e,t,r,s){let i={error:r,code:t,...s!==void 0&&{field:s}};return{statusCode:e,headers:E,body:JSON.stringify(i)}}var S=new Set(["email","normalizedemail","normalizedreceiveremail","receiveremail","recipientemail","token","tokenhash","password","secret","authorization","accesstoken","refreshtoken","idtoken"]),I="[REDACTED]";function u(e){if(e==null)return e;if(Array.isArray(e))return e.map(u);if(typeof e=="object"){let t={};for(let[r,s]of Object.entries(e))S.has(r.toLowerCase())?t[r]=I:t[r]=u(s);return t}return e}function p(e,t,r){let s={level:e,message:t,timestamp:new Date().toISOString(),...r?u(r):{}};console.log(JSON.stringify(s))}var g={info(e,t){p("info",e,t)},warn(e,t){p("warn",e,t)},error(e,t){p("error",e,t)},debug(e,t){p("debug",e,t)}};var x=new T({}),_=A.from(x),C=new h({}),O=process.env.USER_PROFILES_TABLE,F=process.env.SES_SENDER_EMAIL??"noreply@synccircle.com";function k(e){if(typeof e!="string"||!/^\d{4}-\d{2}-\d{2}$/.test(e))return!1;let[r,s,i]=e.split("-"),o=parseInt(r,10),n=parseInt(s,10),a=parseInt(i,10);if(n<1||n>12||a<1)return!1;let l=new Date(o,n-1,a);return l.getFullYear()===o&&l.getMonth()===n-1&&l.getDate()===a}function b(e){if(!e||typeof e!="object")return{valid:!1,errorMessage:"Invalid request body",errorField:void 0};let{taskTitle:t,dueDate:r}=e;return typeof t!="string"||t.trim().length===0?{valid:!1,errorMessage:"taskTitle is required and must be a non-empty string",errorField:"taskTitle"}:t.length>200?{valid:!1,errorMessage:"taskTitle must not exceed 200 characters",errorField:"taskTitle"}:typeof r!="string"||!k(r)?{valid:!1,errorMessage:"dueDate must be a valid date in YYYY-MM-DD format",errorField:"dueDate"}:{valid:!0,taskTitle:t,dueDate:r}}function w(e,t){let r=`Reminder: "${e}" is due on ${t}`,s=["Hi there!","",`This is a friendly reminder that your task "${e}" is due on ${t}.`,"","Make sure to complete it before the deadline. You've got this!","","\u2014 The SyncCircle Team"].join(`
`),i=`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Task Reminder - SyncCircle</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f7; color: #333333;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f7; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
          <tr>
            <td style="background-color: #4f46e5; padding: 32px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">SyncCircle</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 16px; font-size: 20px; color: #1a1a2e;">Task Reminder</h2>
              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.5; color: #4a4a68;">
                Hi there! This is a friendly reminder that your task <strong>"${e}"</strong> is due on <strong>${t}</strong>.
              </p>
              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.5; color: #4a4a68;">
                Make sure to complete it before the deadline. You've got this!
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 40px; background-color: #f9fafb; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                &copy; ${new Date().getFullYear()} SyncCircle. You received this email because you have a task due soon.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;return{subject:r,textBody:s,htmlBody:i}}async function ee(e){let t;try{t=JSON.parse(e.body??"{}")}catch{return c(400,d.VALIDATION_ERROR,"Invalid JSON body")}let r=b(t);if(!r.valid)return c(400,d.VALIDATION_ERROR,r.errorMessage,r.errorField);let{taskTitle:s,dueDate:i}=r,o=e.requestContext.authorizer?.claims?.sub;if(!o)return c(401,d.UNAUTHORIZED,"Missing authentication");try{let n=await _.send(new D({TableName:O,Key:{userId:o}}));if(!n.Item)return c(404,d.NOT_FOUND,"User profile not found");let a=n.Item.email,{subject:l,textBody:f,htmlBody:m}=w(s,i),y=new N({Source:F,Destination:{ToAddresses:[a]},Message:{Subject:{Data:l,Charset:"UTF-8"},Body:{Text:{Data:f,Charset:"UTF-8"},Html:{Data:m,Charset:"UTF-8"}}}});return await C.send(y),g.info("Task reminder email sent successfully",{userId:o,taskTitle:s,dueDate:i}),R({message:"Reminder email sent successfully"})}catch(n){let a=n instanceof Error?n.message:String(n);return g.error("Failed to send reminder email",{userId:o,errorMessage:a}),c(500,d.INTERNAL_ERROR,"Failed to send reminder email")}}export{w as composeReminderEmail,ee as handler,k as isValidDueDate,b as validateNotifyRequest};
//# sourceMappingURL=index.mjs.map
