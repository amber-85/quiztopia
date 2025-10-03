export const errorHandler=()=>{
    return{
        onError:async(request)=>{
           console.error("Error caught in errorHandler middleware:",request.error);
            //set a modified and personalized error response
           request.response={
            statusCode:request.error.statusCode || 500,
            body:JSON.stringify({
                error:request.error.name || "Error",
                message:request.error.message || "Error occurred"
            }),
           };
        },
    };
};