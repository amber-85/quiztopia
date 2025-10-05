import middy from "@middy/core";
import jsonBodyParser from "@middy/http-json-body-parser";
import {QueryCommand, DeleteCommand, GetCommand} from "@aws-sdk/lib-dynamodb";
import {dynamoDb} from "../../services/db.mjs";
import dotenv from "dotenv";
import {logger} from "../../middleware/logger.mjs";
import { errorHandler } from "../../middleware/errorHandler.mjs";
import { authMiddleware } from "../../middleware/authMiddleware.mjs";

dotenv.config();

const deleteQuizFn=async(event)=>{
    const quizId=event.pathParameters?.quizId
    if (!quizId) return {statusCode:400, body:JSON.stringify({error: "Mssing quizId"})};

    //get quiz meta
    const metaRes=await dynamoDb.send(new GetCommand({
        TableName:process.env.QUIZGAME_TABLE,
        Key:{PK: `QUIZ#${quizId}`, SK: "META"}
    }));
    const meta=metaRes.Item;
    if(!meta) return {statusCode:404, body:JSON.stringify({error:"Quiz not found"})};

    //verify creator
    const authUser=event.user;
    if (!authUser || authUser.userId !==meta.creatorId){
        return {statusCode:403, body:JSON.stringify({error:" Forbidden: only creator can delete quiz"})};
    }

    //query all items under this quiz (META+OPTION# ?any ANSWERUSER# if present)
    const query=new QueryCommand({
        TableName:process.env.QUIZGAME_TABLE,
        KeyconditionExpression: "PK=:PK",
        ExpressionAttributeValues: {
            ":PK": `QUIZ#${quizId}`
        }
    });

    const items=(await dynamoDb.send(query)).Items || []

    //delete each item
    for (const it of items){
        await dynamoDb.send(new DeleteCommand({
            TableName:process.env.QUIZGAME_TABLE,
            Key:{PK:it.PK, SK:it.SK}
        }));
    }

    return {statusCode:200, body:JSON.stringify({message:"Quiz deleted"})};

};

export const handler=middy(deleteQuizFn)
    .use(authMiddleware())
    .use(logger())
    .use(errorHandler())