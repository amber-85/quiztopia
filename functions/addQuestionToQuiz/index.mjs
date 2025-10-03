import {v4 as uuid4} from "uuid";
import {PutCommand} from "@aws-sdk/lib-dynamodb";
import {dynamoDb} from "../../services/db.mjs";
import dotenv from "dotenv";
import jsonBodyParser from "@middy/http-json-body-parser";
import { authMiddleware } from "../../middleware/authMiddleware.mjs";
import { errorHandler } from "../../middleware/errorHandler.mjs";
import middy from "@middy/core";

dotenv.config();

const addQuestionToQuizFn=async(event)=>{
    const {quizId}=event.pathParameters;
    const{text, latitude, longitude, options}=event.body;

    if(!quizId || !text || !options || options.length<2){
        return {
            statusCode:400,
            body:JSON.stringify({error:"Invalid input"})
        };
    }

    //check the correct answer number
     const correctCount = options.filter(o => o.is_correct === true).length;
        if (correctCount !== 1) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: "Each question must have exactly one correct answer" }),
                };
        }

    const questionId=uuid4();

    //create question
    const questionItem={
        PK:`QUIZ#${quizId}`,
        SK:`QUESTION#${questionId}`,
        ItemType:"Question",
        text,
        latitude: Number(latitude),
        longitude: Number(longitude),
        createdAt: new Date().toISOString(),
    }

    await dynamoDb.send(new PutCommand({
        TableName:process.env.QUIZGAME_TABLE,
        Item:questionItem,
    }));

    //add options
    for (let i=0; i<options.length; i++){
        const opt=options[i];

        //verify is_correct is boolean
        if (typeof opt.is_correct !== "boolean") {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: "Invalid option format, is_correct must be true/false" }),
            };
        }

       

        //create optionItem
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
    return {
        statusCode:201,
        body:JSON.stringify({message: "Question added to quiz", questionId})
    }
}

export const handler=middy(addQuestionToQuizFn)
    .use(jsonBodyParser())
    .use(authMiddleware())
    .use(logger())
    .use(errorHandler())