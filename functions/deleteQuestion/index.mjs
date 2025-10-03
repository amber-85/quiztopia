import {DeleteCommand, QueryCommand} from "@aws-sdk/lib-dynamodb";
import {dynamoDb} from "../../services/db.mjs";
import dotenv from "dotenv";
import jsonBodyParser from "@middy/http-json-body-parser";
import { authMiddleware } from "../../middleware/authMiddleware.mjs";
import { errorHandler } from "../../middleware/errorHandler.mjs";
import middy from "@middy/core";

dotenv.config();

