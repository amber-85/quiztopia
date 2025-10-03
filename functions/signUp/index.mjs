import middy from "@middy/core";
import jsonBodyParser from "@middy/http-json-body-parser";
import {v4 as uuid4} from "uuid";
import bcrypt from "bcryptjs";
import {logger} from "../../middleware/logger.mjs"
import {errorHandler} from "../../middleware/errorHandler.mjs"
import {getUserByEmail} from "../../services/getUserByEmail.mjs"
import {dynamoDb} from "../../services/db.mjs"
import dotenv from "dotenv";
import { PutCommand } from "@aws-sdk/lib-dynamodb";

dotenv.config();


const signupFn=async(event)=>{
    const {username, email, password}=event.body;
    
    //validate email and password
    if(!username || !email || !password){
        return {
            statusCode:400,
            body:JSON.stringify({error:"Email and password are required"})};
    }

    //validate email format
    const emailRegex = /\S+@\S+\.\S+/;

    if (!emailRegex.test(email)) {
        return { statusCode: 400, body: JSON.stringify({ error: "Invalid email format" }) };
    }

    //check if user already exists
    const existingUser=await getUserByEmail(email);

    if(existingUser){
        return {statusCode:400, body:JSON.stringify({error:"User with this email already exists"})};
    }

    //Hash password
    const hashedPassword=await bcrypt.hash(password,10);

    const userId=uuid4();

    //create user in DB
    const newUser={
        PK: `USER#${userId}`,
        SK: "PROFILE",
        ItemType:"User",
        userId,
        username,
        email,
        password:hashedPassword,
        total_scores:0,
        createdAt:new Date().toISOString(),
    };

    await dynamoDb.send(new PutCommand({
        TableName:process.env.QUIZGAME_TABLE,
        Item:newUser,
    }));

    return{
        statusCode:201,
        body:JSON.stringify({
            message:"User created successfully",
            user:{
                userId:newUser.userId,
                username:newUser.username,
                email:newUser.email,
                total_scores:newUser.total_scores,
            },
        }),
    };
};

export const handler=middy(signupFn)
    .use(jsonBodyParser())
    .use(logger())
    .use(errorHandler());