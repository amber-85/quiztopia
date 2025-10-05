import {GetCommand} from "@aws-sdk/lib-dynamodb";
import {dynamoDb} from "../../services/db.mjs";
import dotenv from "dotenv";
import {logger} from "../../middleware/logger.mjs"
import {errorHandler} from "../../middleware/errorHandler.mjs"
import middy from "@middy/core";
import { authMiddleware } from "../../middleware/authMiddleware.mjs";
import { getAllQuestionsByQuizId } from "../../services/getAllQuestionsByQuizId.mjs";

dotenv.config();

const getQuizByQuizIdFn=async(event)=>{
     const {quizId}=event.pathParameters;

    if (!quizId){
        return {statusCode:400, body:JSON.stringify({error:"Missing quizId"})};
    }

    //get quiz Meta
    const quizRes=await dynamoDb.send(new GetCommand({
        TableName:process.env.QUIZGAME_TABLE,
        Key:{PK:`QUIZ#${quizId}`,SK:"META"},
    }));

    if (!quizRes.Item){
        return{statusCode:404,body:JSON.stringify({error:"Quiz not found"})};
    }
    
    const quiz=quizRes.Item;

    //get all questions and options
    const questions=await getAllQuestionsByQuizId(quizId);
    quiz.questions=questions;

    return{statusCode:200, body:JSON.stringify({quiz})};
};

export const handler=middy(getQuizByQuizIdFn)
    .use(authMiddleware())
    .use(logger())
    .use(errorHandler())
   
