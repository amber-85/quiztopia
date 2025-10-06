import middy from "@middy/core";
import jsonBodyParser from "@middy/http-json-body-parser";
import bcrypt from "bcryptjs";
import {logger} from "../../middleware/logger.mjs"
import {errorHandler} from "../../middleware/errorHandler.mjs"
import {getUserByEmail} from "../../services/getUserByEmail.mjs"
import dotenv from "dotenv";
import jwt from "jsonwebtoken";

dotenv.config();

const loginFn=async(event)=>{
    const {email,password}=event.body;

    //validate email and password
    if (!email || !password){
        return {statusCode:400, body:JSON.stringify({error:"Email and password are required"})};
    }

    //Find user by email 
    const user=await getUserByEmail(email);

    if(!user){
        return {statusCode:400,body:JSON.stringify({error: "Invalid email or password"})};
    }

    //compare passwords
    const isValid=await bcrypt.compare(password, user.password);

    if(!isValid){
        return {statusCode:400, body:JSON.stringify({error:"Invalid email or password"})};
    }

    //generate JWT token
    const token=jwt.sign(
        {userId:user.userId, email:user.email, username:user.username},
        process.env.JWT_SECRET,
        {expiresIn:"1h"}
    );

    return{
        statusCode:200,
        body:JSON.stringify({
            token,
            user:{
                userId:user.userId,
                username:user.username,
                email:user.email,
                // total_scores:user.total_scores,
            },
        }),
    };
};

export const handler=middy(loginFn)
    .use(jsonBodyParser())
    .use(logger())
    .use(errorHandler())