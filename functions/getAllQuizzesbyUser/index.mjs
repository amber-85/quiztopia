import {ScanCommand} from "@aws-sdk/lib-dynamodb";
import {dynamoDb} from "../../services/db.mjs";
import dotenv from "dotenv";
import {logger} from "../../middleware/logger.mjs"
import {errorHandler} from "../../middleware/errorHandler.mjs"
import middy from "@middy/core";
import jsonBodyParser from "@middy/http-json-body-parser";
import { authMiddleware } from "../../middleware/authMiddleware.mjs";
import { getAllQuestionsByQuizId } from "../../services/getAllQuestionsByQuizId.mjs";

dotenv.config();

const getAllquizzesByUserFn=async(event)=>{
    const userId=event.user.userId;

    //query all quizzes created by this user
    const quizRes=await dynamoDb.send(new ScanCommand({
        TableName:process.env.QUIZGAME_TABLE,
        FilterExpression:"ItemType=:quizType And creatorId=:creatorId",
        ExpressionAttributeValues:{
            ":quizType":"Quiz",
            ":creatorId":userId,
        }
    }));

    const quizzes=quizRes.Items || [];

    //get questions +options for each quiz
    for(const quiz of quizzes){
        quiz.questions=await getAllQuestionsByQuizId(quiz.quizId);
    }

    return{statusCode:200, body:JSON.stringify({quizzes})}
};

export const handler=middy(getAllquizzesByUserFn)
    .use(jsonBodyParser())
    .use(authMiddleware())
    .use(logger())
    .use(errorHandler())