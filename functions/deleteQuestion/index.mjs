import {DeleteCommand, QueryCommand,GetCommand} from "@aws-sdk/lib-dynamodb";
import {dynamoDb} from "../../services/db.mjs";
import dotenv from "dotenv";
import jsonBodyParser from "@middy/http-json-body-parser";
import { authMiddleware } from "../../middleware/authMiddleware.mjs";
import { errorHandler } from "../../middleware/errorHandler.mjs";
import {logger} from "../../middleware/logger.mjs"
import middy from "@middy/core";

dotenv.config();

const deleteQuestionFn=async(event)=>{
    const {quizId,questionId}=event.pathParameters;
    const userId=event.user.userId;

   
    //validate quizId and questionId
    if(!quizId || !questionId){
        return{statusCode:400, body:JSON.stringify({error: "Missing quizId or questionId"})};
    }

     //verify the current user is creator of the question
    const quizRes=await dynamoDb.send(new GetCommand({
        TableName:process.env.QUIZGAME_TABLE,
        Key:{
            PK:`QUIZ#${quizId}`,
            SK:"META"
        }
    }));

    if (quizRes.Item.creatorId !==userId){
        return {statusCode:403, body:JSON.stringify({error:"Not authorized to delete this question"})}
    }

    //delete the question
    await dynamoDb.send(new DeleteCommand({
        TableName:process.env.QUIZGAME_TABLE,
        Key:{
            PK:`QUIZ#${quizId}`,
            SK:`QUESTION#${questionId}`
        }
    }));

    //find and delete all options linked to this question
    const optionsRes=await dynamoDb.send(new QueryCommand({
        TableName:process.env.QUIZGAME_TABLE,
        KeyConditionExpression:"PK=:PK",
        ExpressionAttributeValues:{":PK":`QUIZ#${quizId}#QUESTION#${questionId}`}     
    }));

    if (optionsRes.Items && optionsRes.Items.length>0){
        for (const option of optionsRes.Items){
            await dynamoDb.send(new DeleteCommand({
                TableName:process.env.QUIZGAME_TABLE,
                Key:{
                    PK:option.PK,
                    SK:option.SK,
                }
            }));
        }
    }

    return {
        statusCode:200, body:JSON.stringify({message: "Question and its options deleted"}),
    };
};

export const handler=middy(deleteQuestionFn)

    .use(authMiddleware())
    .use(logger())
    .use(errorHandler())
