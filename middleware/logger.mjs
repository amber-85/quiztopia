export const logger=()=>{
    return{
        before:(request)=>{
            console.log("Request:", JSON.stringify(request,null,2));
        },
        after:async(request)=>{
            console.log("Response:",JSON.stringify(request.response,null,2));
        },
        onError:async(request)=>{
            console.error("Error:",request.error);
        },
    };
};