#!/usr/bin/env node
import { createStore, listen } from "./rpc.ts";

const port = Number(process.env.NHC_PORT || 18732);
const token = process.env.NHC_OPERATOR_TOKEN;
listen(createStore(), port, token);
