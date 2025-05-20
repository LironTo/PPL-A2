import { Program as ProgramL3, makeProgram as makeL3Program, makeProgram, parseL3 } from './L3/L3-ast';
import * as fs from 'fs';
import * as path from 'path';

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
import { cons } from './shared/list';
/*
Purpose: rewrite all occurrences of DictExp in a program to AppExp.
Signature: Dict2App (exp)
Type: Program -> Program
*/

// Converts L32 DictExp to L3 AppExp
// SymbolSExp | EmptySExp | CompoundSExp
export const dictToAppExp = (exp: DictExp): AppExp => {
    console.log("DictToAppExp: ", exp);
    console.log("DictToAppExp: ", exp.entries);
    return makeAppExp(
        makeVarRef("dict"),
        [EntriesToLitExp(exp.entries)]
    );}

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
    isLitExp(exp) ? makeCompoundSExp(makeSymbolSExp(exp.val.toString()), makeEmptySExp()) :
    isIfExp(exp) ? makeCompoundSExp(makeSymbolSExp("if"), makeCompoundSExp(CExpToSExp(exp.test), makeCompoundSExp(CExpToSExp(exp.then), makeCompoundSExp(CExpToSExp(exp.alt), makeEmptySExp())))) :
    isAppExp(exp) ? makeCompoundSExp(CExpToSExp(exp.rator), reduce((acc: SExpValue, next: SExpValue)=>makeCompoundSExp(next, acc),makeCompoundSExp(makeEmptySExp(),makeEmptySExp()),map(CExpToSExp, exp.rands))):
    isLetExp(exp) ? makeCompoundSExp(makeSymbolSExp("let"), makeCompoundSExp(
        reduce((acc: SExpValue, next: SExpValue)=>makeCompoundSExp(next, acc),makeCompoundSExp(makeEmptySExp(),makeEmptySExp()), map((x:Binding)=>CExpToSExp(x) ,exp.bindings)),
        reduce((acc: SExpValue, next: SExpValue)=>makeCompoundSExp(next, acc),makeCompoundSExp(makeEmptySExp(),makeEmptySExp()), map(CExpToSExp, exp.body)))) :
    makeSymbolSExp("unsupported");



export const Dict2App  = (exp: ProgramL32) : ProgramL3 => {

    const q23Content = `(define dict (lambda (x) x))

(define get (lambda (dictio key)
        (if (eq? dictio '())
            (make-error "No matched key found in dict")
            (if (eq? (car (car dictio)) key)
                (car (cdr (car dictio)))
                (get (cdr dictio) key)
            )
        )
    )
)`;

    const newProgram = makeL32Program(map((x: Exp) => isDictExp(x) ? dictToAppExp(x) : x, exp.exps));
    const unparsed = unparseL32(newProgram).substring(4);
    const found = findDictKeyPairs(unparsed);
    const unparsedFixed = `(L3 ${q23Content} ${found}`;
    const res = parseL3(unparsedFixed);
    return isOk(res) ? res.value : makeProgram([]);
}


/**
 * Replaces every ((dict ...) '<key>) with (get (dict ...) '<key>)
 * Only matches when the dict expression is immediately followed by a single-quote and a symbol, then a closing parenthesis.
 */
export function findDictKeyPairs(unparsed: string): string {
    let i = 0;
    let j = 0;
    while (i < unparsed.length) {
        if (unparsed.startsWith("(dict", i)) {
            let start = i;
            let parenCount = 0;
            j = i;
            let found = false;
            // Find the matching closing parenthesis for the (dict ...) part
            while (j < unparsed.length) {
                if (unparsed[j] === '(') parenCount++;
                if (unparsed[j] === ')') parenCount--;
                if (parenCount === 0 && j > start) {
                    found = true;
                    break;
                }
                j++;
            }
            if (found) {
                if(unparsed.length >= j + 2 && unparsed[j+1] === " " && unparsed[j+2] === "'"){
                    // Replace the dict expression with a get expression
                    unparsed = unparsed.slice(0, start) + "get " + unparsed.slice(start, j)  + unparsed.slice(j);
                    i = start + 7; // Move past the new (get ...) expression
                }
            }
        }
        i++;
    }
    return unparsed;
}

/*
Purpose: Transform L32 program to L3
Signature: L32ToL3(prog)
Type: Program -> Program
*/
export const L32toL3 = (prog : ProgramL32): ProgramL3 => {
    return Dict2App(prog);
}
    
    

    