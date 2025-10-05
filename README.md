endpoints
signup 
POST - https://jljrod168i.execute-api.eu-north-1.amazonaws.com/dev/signup

login 
POST - https://jljrod168i.execute-api.eu-north-1.amazonaws.com/dev/login

create quiz 
POST - https://jljrod168i.execute-api.eu-north-1.amazonaws.com/dev/quiz

delete quiz 
DELETE - https://jljrod168i.execute-api.eu-north-1.amazonaws.com/dev/quiz/{quizId}

add question  
POST - https://jljrod168i.execute-api.eu-north-1.amazonaws.com/dev/quiz/{quizId}/question

update question  
PUT - https://jljrod168i.execute-api.eu-north-1.amazonaws.com/dev/quiz/{quizId}/question/{questionId}

delete question  
DELETE - https://jljrod168i.execute-api.eu-north-1.amazonaws.com/dev/quiz/{quizId}/question/{questionId}

get all questions by quizId 
GET - https://jljrod168i.execute-api.eu-north-1.amazonaws.com/dev/quiz/{quizId}

get all quizzes by userId
GET - https://jljrod168i.execute-api.eu-north-1.amazonaws.com/dev/quizzes/user/{userId}

Get all quizzes by coordinates
GET - https://jljrod168i.execute-api.eu-north-1.amazonaws.com/dev/quizzes/location

answer question
POST - https://jljrod168i.execute-api.eu-north-1.amazonaws.com/dev/quiz/{quizId}/question/{questionId}/answer

