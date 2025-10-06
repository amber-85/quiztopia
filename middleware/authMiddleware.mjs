import middy from "@middy/core";
import createError from "http-errors";
import jwt from "jsonwebtoken";

export const authMiddleware=()=>{
    const before=async(request)=>{
        const {headers}=request.event;
        const token=headers.Authorization || headers.authorization;

        if(!token){
            throw new createError.Unauthorized("Missing Authorization header");
        }
        try{
            const decoded=jwt.verify(token.replace("Bearer","").trim(), process.env.JWT_SECRET);
            request.event.user=decoded; // Attach user info to event
        }catch(error){
            throw new createError.Unauthorized("Invalid or expired token");
        }
    };
    return{before};
};