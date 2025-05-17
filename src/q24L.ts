import { Program, makeProgram } from './L3/L3-ast';

import {
    isProgram, isDefineExp, isCExp, isAppExp, isIfExp, isProcExp, isLetExp, isLitExp,
    isNumExp, isBoolExp, isStrExp, isPrimOp, isVarRef, isDictExp,
    Program as L32Program, CExp as L32CExp, Exp as L32Exp,
    LitExp,
    isAtomicExp
} from './L32/L32-ast';

import {
    SExpValue as L32SExpValue,
    makeClosure
} from './L32/L32-value';

import {
    makeDefineExp, makeAppExp, makeLitExp, makeVarRef,
    makeIfExp, makeProcExp, makeLetExp, makeBinding,
    CExp, Exp, AppExp, DictExp, DictEntry
} from './L32/L32-ast';

import {
    makeCompoundSExp, makeEmptySExp, makeSymbolSExp,
    SExpValue, CompoundSExp
} from './L32/L32-value';



import { map } from "ramda";
/*
Purpose: rewrite all occurrences of DictExp in a program to AppExp.
Signature: Dict2App (exp)
Type: Program -> Program
*/

// Converts L32 DictExp to L3 AppExp
// SymbolSExp | EmptySExp | CompoundSExp
const dictToAppExp = (exp: DictExp): AppExp => 
    makeAppExp(makeVarRef("dict"), )
    );


const PairsToLitExp = (pairs: DictEntry[]): LitExp[] => {
    const entries: LitExp[] = pairs.map(entry => {
        const key = makeSymbolSExp(entry.key);
        const val = entry.val;
        return makeLitExp(makeCompoundSExp(key, val));
    });
    return entries;
}

const convertCExpToSExpValue = (exp: CExp): SExpValue => 
    isAtomicExp(exp) ? makeSymbolSExp(exp.toString()) :
    isLitExp(exp) ? makeCompoundSExp(exp.val, makeEmptySExp()) :
    isIfExp(exp) ? makeCompoundSExp(makeClosure) :

export const Dict2App  = (exp: Program) : Program =>
    //@TODO
    makeProgram([]);


/*
Purpose: Transform L32 program to L3
Signature: L32ToL3(prog)
Type: Program -> Program
*/
export const L32toL3 = (prog : Program): Program =>
    //@TODO
    makeProgram([]);