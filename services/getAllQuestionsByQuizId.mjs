import {QueryCommand} from "@aws-sdk/lib-dynamodb";
import {dynamoDb} from "./db.mjs";



export const getAllQuestionsByQuizId=async(quizId)=>{
    //get all questions for the quiz
    const questionsRes=await dynamoDb.send(new QueryCommand({
        TableName:process.env.QUIZGAME_TABLE,
        KeyConditionExpression:"PK=:PK AND begins_with(SK, :skPrefix)",
        ExpressionAttributeValues:{
            ":PK":`QUIZ#${quizId}`,
            ":skPrefix":`QUESTION#`,
        }
    }));

    const questions=questionsRes.Items||[];

    //for each question, get its options
    for (const question of questions){
        const questionId=question.SK.split("#")[1];

        const optionsRes=await dynamoDb.send(new QueryCommand({
            TableName:process.env.QUIZGAME_TABLE,
            KeyConditionExpression:"PK=:PK",
            ExpressionAttributeValues:{
                ":PK":`QUIZ#${quizId} #QUESTION#${questionId}`
            }
        }));
        question.options=optionsRes.Items||[];
    }

    return questions
}