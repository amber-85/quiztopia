import {PutCommand, DeleteCommand,QueryCommand,GetCommand} from "@aws-sdk/lib-dynamodb";
import {dynamoDb} from "../../services/db.mjs";
import dotenv from "dotenv";
import jsonBodyParser from "@middy/http-json-body-parser";
import { authMiddleware } from "../../middleware/authMiddleware.mjs";
import { errorHandler } from "../../middleware/errorHandler.mjs";
import {logger} from "../../middleware/logger.mjs"
import middy from "@middy/core";

dotenv.config();

const updateQuestionFn=async(event)=>{
    const {quizId,questionId}=event.pathParameters;
    const{text,latitude,longitude,options}=event.body;
    const userId=event.user.userId;

    if(!quizId || !questionId){
        return{statusCode:400, body:JSON.stringify({error:"Missing quizId or questionId"})};         
    }

    if(!text||!options||options.length<2){
        return{statusCode:400, body:JSON.stringify({error: "Invalid input"})};
    }

    //verify the user is the creator of the quiz
    const quizRes=await dynamoDb.send(new GetCommand({
        TableName:process.env.QUIZGAME_TABLE,
        Key:{PK:`QUIZ#${quizId}`,SK:"META"},
    }));

    if(!quizRes.Item || quizRes.Item.creatorId !==userId){
        return {statusCode:403, body:JSON.stringify({error:"Not authorized to update this question"})};
    }

    //validate exactly one correct answer
    const correctCount=options.filter(o=>o.is_correct ===true).length;
    if(correctCount !==1){
        return{statusCode:400, body:JSON.stringify({error:"Each question must have one correct answer"})}
    }

    //update the question item
    const updateQuestion={
        PK:`QUIZ#${quizId}`,
        SK:`QUESTION#${questionId}`,
        ItemType:"Question",
        text,
        latitude:Number(latitude),
        longitude:Number(longitude),
        updatedAt:new Date().toISOString(),
    };

    await dynamoDb.send(new PutCommand({
        TableName:process.env.QUIZGAME_TABLE,
        Item:updateQuestion,
    }));

    //delete old options
    const oldOptions=await dynamoDb.send(new QueryCommand({
        TableName:process.env.QUIZGAME_TABLE,
        KeyConditionExpression:"PK=:PK",
        ExpressionAttributeValues:{":PK":`QUIZ#${quizId}#QUESTION#${questionId}`}
    }));

    if (oldOptions.Items.length>0){
        await Promise.all(oldOptions.Items.map(opt=>
            dynamoDb.send(new DeleteCommand({ TableName:process.env.QUIZGAME_TABLE, Key:{PK:opt.PK,SK:opt.SK},}))
        ));
    }

    //insert new options
    for (let i=0; i<options.length;i++){
        const opt=options[i];
        if(!opt.text ||typeof opt.is_correct !=="boolean"){
            return{statusCode:400, body:JSON.stringify({error:"Invalid option format"})};
        }

        const optionItem={
            PK:`QUIZ#${quizId}#QUESTION#${questionId}`,
            SK:`OPTION#${i+1}`,
            ItemType:"Option",
            optionId:`${i+1}`,
            option_text:opt.text,
            is_correct:opt.is_correct,
        }

        await dynamoDb.send(new PutCommand({
            TableName:process.env.QUIZGAME_TABLE,
            Item:optionItem,
        }));
    }

    return{statusCode:200,body:JSON.stringify({message:"Question updated successfully"})}
};

export const handler=middy(updateQuestionFn)
    .use(jsonBodyParser())
    .use(authMiddleware())
    .use(logger())
    .use(errorHandler())