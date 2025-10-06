import middy from "@middy/core";
import jsonBodyParser from "@middy/http-json-body-parser";
import {QueryCommand, DeleteCommand, GetCommand,ScanCommand} from "@aws-sdk/lib-dynamodb";
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


    //query all questions under this quiz 
    const questionQuery=new QueryCommand({
        TableName:process.env.QUIZGAME_TABLE,
        KeyconditionExpression: "PK=:PK",
        ExpressionAttributeValues: {
            ":PK": `QUIZ#${quizId}`
        }
    });

    const questionRes=await dynamoDb.send(questionQuery);
    const questions=questionRes.Items||[];

    //for each question, delete its options
    for (const question of questions){
        if (question.SK.startsWith("QUESTION#")){
            const questionId=question.SK.split("#")[1];

            const optionQuery=new QueryCommand({
                TableName:process.env.QUIZGAME_TABLE,
                KeyCondidtionExpression:"PK=:PK",
                ExpressionAttributeValues:{
                    ":PK":`QUIZ#${quizId}#QUESTION#${questionId}`,
                }
            });

            const optionRes=await dynamoDb.send(optionQuery);
            const options=optionRes.Items||[];

            for (const opt of options){
                await dynamoDb.send(
                    new DeleteCommand({
                        TableName:process.env.QUIZGAME_TABLE,
                        Key: {PK:opt.PK, SK:opt.SK}
                    })
                );
            }
        }
    }

    //delete all questions
    for (const item of questions){
        await dynamoDb.send(new DeleteCommand({
            TableName:process.env.QUIZGAME_TABLE,
            Key:{PK:item.PK, SK:item.SK}
        }));
    }

    //delete the quiz META

    await dynamoDb.send(new DeleteCommand({
        TableName:process.env.QUIZGAME_TABLE,
        Key:{PK:`QUIZ#${quizId}`, SK:"META"}
    }));

    //delete all user answers for this quiz
    const scanAnswers=new ScanCommand({
        TableName:process.env.QUIZGAME_TABLE,
        FilterExpression:"begins_with(SK,:prefix)",
        ExpressionAttributeValues:{":prefix":`ANSWER#${quizId}#`}
    });

    const answersRes=await dynamoDb.send(scanAnswers);
    const answers=answersRes.Items||[];

    for (const ans of answers){
        await dynamoDb.send(new DeleteCommand({
            TableName:process.env.QUIZGAME_TABLE,
            Key:{PK:ans.PK,SK:ans.SK}
        }));
    }

    return {statusCode:200, body:JSON.stringify({message:"Quiz,questions, options and answers deleted"})};

};

export const handler=middy(deleteQuizFn)
    .use(authMiddleware())
    .use(logger())
    .use(errorHandler())