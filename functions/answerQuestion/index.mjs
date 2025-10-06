import {GetCommand, PutCommand, UpdateCommand, QueryCommand} from "@aws-sdk/lib-dynamodb";
import {dynamoDb} from "../../services/db.mjs";
import dotenv from "dotenv";
import middy from "@middy/core";
import jsonBodyParser from "@middy/http-json-body-parser";
import { authMiddleware } from "../../middleware/authMiddleware.mjs";
import { logger } from "../../middleware/logger.mjs";
import { errorHandler } from "../../middleware/errorHandler.mjs";

dotenv.config();

const answerQuestionFn=async(event)=>{
    const {quizId, questionId}=event.pathParameters;
    const {optionId}=event.body;
    const userId=event.user.userId;

    if (!quizId||!questionId||!optionId){
        return{statusCode:400,body:JSON.stringify({error:"Missing quizId,questionId,or optionId"})};
    }

    //check if user already answered this question
    const existingAnswer=await dynamoDb.send(new GetCommand({
        TableName:process.env.QUIZGAME_TABLE,
        Key:{
            PK:`USER#${userId}`,
            SK:`ANSWER#${quizId}#${questionId}`
    }
    }));

    if (existingAnswer.Item){
        return{statusCode:409, body:JSON.stringify({message:"You have already answered this question.", answer:existingAnswer.Item})};
    }
    
    //verify the question exist
    const questionRes=await dynamoDb.send(new GetCommand({
        TableName:process.env.QUIZGAME_TABLE,
        Key:{
            PK:`QUIZ#${quizId}`,
            SK:`QUESTION#${questionId}`,
        },
    }));

    if(!questionRes.Item){
        return{statusCode:404, body:JSON.stringify({error:"Question not found"})};
    }

    //verify the selected option exists
    const optionRes=await dynamoDb.send(new GetCommand({
        TableName:process.env.QUIZGAME_TABLE,
        Key:{
            PK:`QUIZ#${quizId}#QUESTION#${questionId}`,
            SK:`OPTION#${optionId}`,
        },
    }));

    if (!optionRes.Item){
        return {statusCode:404,body:JSON.stringify({error:"Option not found"})};
    }

    const is_correct=optionRes.Item.is_correct===true;
    const answeredAt=new Date().toISOString();

    //get the correct answer for feedback
    let correctAnswer=null;
    if (!is_correct){
        const correctOptionRes=await dynamoDb.send(new QueryCommand({
            TableName:process.env.QUIZGAME_TABLE,
            KeyConditionExpression:"PK=:PK",
            ExpressionAttributeValues:{":PK":`QUIZ#${quizId}#QUESTION#${questionId}`}
    }));
    
    const correctOption=correctOptionRes.Items.find((opt)=>opt.is_correct===true);
    correctAnswer=correctOption ? correctOption.option_text:null;
    }
   

    //save the answer
    const answerItem={
        PK:`USER#${userId}`,
        SK:`ANSWER#${quizId}#${questionId}`,
        ItemType:"Answer",
        quizId,
        questionId,
        optionId,
        is_correct,
        answeredAt,
    }

    await dynamoDb.send(new PutCommand({
        TableName:process.env.QUIZGAME_TABLE,
        Item:answerItem,
    }));

    // //if correct, increment total score
    // if (is_correct){
    //     await dynamoDb.send(new UpdateCommand({
    //        TableName:process.env.QUIZGAME_TABLE,
    //        Key:{
    //         PK:`USER#${userId}`,
    //         SK:"META",
    //        } ,
    //        UpdateExpression: "ADD total_scores:inc",
    //        ExpressionAttributeValues:{
    //         ":inc":5,
    //        },
    //        ReturnValues:"UPDATED_NEW",
    //     }));
    // }

    return {
        statusCode:200,
        body:JSON.stringify(
            is_correct
                ? {message:"It's correct!", is_correct:true}
                :{
                    message:"Opps, not correct.",
                is_correct:false,
            correct_answer:correctAnswer||"Unknown",}
    )};
};

export const handler=middy(answerQuestionFn)
    .use(jsonBodyParser())
    .use(authMiddleware())
    .use(logger())
    .use(errorHandler())

