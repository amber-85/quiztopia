import {ScanCommand} from "@aws-sdk/lib-dynamodb";  
import { dynamoDb } from "./db.mjs";

export const getUserByEmail=async(email)=>{
    const params={
        TableName:process.env.QUIZGAME_TABLE,
        FilterExpression:"ItemType=:userType AND email=:email",
        ExpressionAttributeValues:{
            ":email":email, 
            ":userType":"User",},
    };
    const result=await dynamoDb.send(new ScanCommand(params));

    if (!result.Items || result.Items.length===0)
        return null;

    return result.Items[0]; //return the first matching user or undefined
};