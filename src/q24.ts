import { Program as ProgramL3, makeProgram as makeL3Program, makeProgram, parseL3 } from './L3/L3-ast';


import { makeOk, makeFailure, isOk, isFailure} from './shared/result'

import {
    isProgram, isDefineExp, isCExp, isAppExp, isIfExp, isProcExp, isLetExp, isLitExp,
    isNumExp, isBoolExp, isStrExp, isPrimOp, isVarRef, isDictExp,
    Program as L32Program, CExp as L32CExp, Exp as L32Exp,
    LitExp,
    isAtomicExp,
    makePrimOp,
    isVarDecl,
    Binding,
    isBinding,
    unparseL32
} from './L32/L32-ast';

import {
    makeDefineExp, makeAppExp, makeLitExp, makeVarRef,
    makeIfExp, makeProcExp, makeLetExp, makeBinding,
    CExp, Exp, AppExp, DictExp, DictEntry, VarDecl, VarRef, Program as ProgramL32,
    makeProgram as makeL32Program,
} from './L32/L32-ast';

import {
    makeCompoundSExp, makeEmptySExp, makeSymbolSExp,
    SExpValue, CompoundSExp
} from './L32/L32-value';




import { map, reduce } from "ramda";
/*
Purpose: rewrite all occurrences of DictExp in a program to AppExp.
Signature: Dict2App (exp)
Type: Program -> Program
*/

// Converts L32 DictExp to L3 AppExp
// SymbolSExp | EmptySExp | CompoundSExp
export const dictToAppExp = (exp: DictExp): AppExp => 
    makeAppExp(
        makeVarRef("dict"),
        [EntriesToLitExp(exp.entries)]
    );

// Converts DictEntries to LitExp
export const EntriesToLitExp = (entries: DictEntry[]): LitExp => 
    makeLitExp(reduce(
        (acc: SExpValue, curr: SExpValue) =>
            makeCompoundSExp(
                curr,
                acc
            ),
            makeCompoundSExp(makeEmptySExp(),makeEmptySExp()),
            map((x: DictEntry) => makeCompoundSExp(makeSymbolSExp(x.key), CExpToSExp(x.val)), entries)))
    
export const CExpToSExp = (exp: CExp|VarDecl|Binding): SExpValue => 
    isNumExp(exp) ? makeSymbolSExp(String(exp.val)) :
    isBoolExp(exp) ? makeSymbolSExp(String(exp.val)) :
    isStrExp(exp) ? makeSymbolSExp(exp.val) :
    isVarRef(exp) ? makeSymbolSExp(exp.var) :
    isVarDecl(exp) ? makeSymbolSExp(exp.var) :
    isBinding(exp) ? makeCompoundSExp(CExpToSExp(exp.var), CExpToSExp(exp.val)) :
    isPrimOp(exp) ? makeSymbolSExp(exp.op) :
    isProcExp(exp) ? makeCompoundSExp(makeSymbolSExp("lambda"), makeCompoundSExp(
        reduce((acc: SExpValue, next: SExpValue)=>makeCompoundSExp(next, acc),makeCompoundSExp(makeEmptySExp(),makeEmptySExp()),map(CExpToSExp, exp.args)), 
        reduce((acc: SExpValue, next: SExpValue)=>makeCompoundSExp(next, acc),makeCompoundSExp(makeEmptySExp(),makeEmptySExp()),map(CExpToSExp, exp.body)))) :
    isLitExp(exp) ? makeCompoundSExp(makeSymbolSExp("quote"), makeSymbolSExp(exp.val.toString())) :
    isIfExp(exp) ? makeCompoundSExp(makeSymbolSExp("if"), makeCompoundSExp(CExpToSExp(exp.test), makeCompoundSExp(CExpToSExp(exp.then), makeCompoundSExp(CExpToSExp(exp.alt), makeEmptySExp())))) :
    isAppExp(exp) ? makeCompoundSExp(CExpToSExp(exp.rator), reduce((acc: SExpValue, next: SExpValue)=>makeCompoundSExp(next, acc),makeCompoundSExp(makeEmptySExp(),makeEmptySExp()),map(CExpToSExp, exp.rands))):
    isLetExp(exp) ? makeCompoundSExp(makeSymbolSExp("let"), makeCompoundSExp(
        reduce((acc: SExpValue, next: SExpValue)=>makeCompoundSExp(next, acc),makeCompoundSExp(makeEmptySExp(),makeEmptySExp()), map((x:Binding)=>CExpToSExp(x) ,exp.bindings)),
        reduce((acc: SExpValue, next: SExpValue)=>makeCompoundSExp(next, acc),makeCompoundSExp(makeEmptySExp(),makeEmptySExp()), map(CExpToSExp, exp.body)))) :
    makeSymbolSExp("unsupported");



export const Dict2App  = (exp: ProgramL32) : ProgramL3 => {
    const res = parseL3("(L3 (define dict (lambda (pairs) pairs))" + unparseL32(makeL32Program(map((x: Exp) => isDictExp(x) ? dictToAppExp(x) : x, exp.exps))).slice(4));
    return isOk(res) ? res.value : makeProgram([]);
}


/*
Purpose: Transform L32 program to L3
Signature: L32ToL3(prog)
Type: Program -> Program
*/
export const L32toL3 = (prog : ProgramL32): ProgramL3 => 
    Dict2App(prog);
    

    