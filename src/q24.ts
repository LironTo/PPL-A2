import { Program as ProgramL3, makeProgram as makeL3Program, parseL3, AppExp as L3AppExp, VarRef as L3VarRef, LitExp as L3LitExp,
    NumExp as L3NumExp, BoolExp as L3BoolExp, StrExp as L3StrExp, PrimOp as L3PrimOp, VarDecl as L3VarDecl, Binding as L3Binding,
    isNumExp as isL3NumExp, isBoolExp as isL3BoolExp, isStrExp as isL3StrExp, isPrimOp as isL3PrimOp, isVarDecl as isL3VarDecl, isBinding as isL3Binding,
    isAppExp as isL3AppExp, isIfExp as isL3IfExp, isProcExp as isL3ProcExp, isLetExp as isL3LetExp, isLitExp as isL3LitExp,
    makeAppExp as makeL3AppExp, makeLitExp as makeL3LitExp, Exp as L3Exp, makeNumExp as makeL3NumExp, makeBoolExp as makeL3BoolExp, 
    makeStrExp as makeL3StrExp, makePrimOp as makeL3PrimOp, makeVarDecl as makeL3VarDecl, makeBinding as makeL3Binding,
    makeDefineExp as makeL3DefineExp, DefineExp as L3DefineExp, ProcExp as L3ProcExp, makeProcExp as makeL3ProcExp,
    makeVarRef as makeL3VarRef, makeIfExp as makeL3IfExp, makeLetExp as makeL3LetExp, parseSExp as parseL3SExp, 
    CExp as L3CExp
 } from './L3/L3-ast';
import { parse } from './shared/parser'
import { SExpValue as L3SExpValue, SymbolSExp as L3SymbolSExp, CompoundSExp as L3CompoundSExp, EmptySExp as L3EmptySExp,
    isSymbolSExp as isL3SymbolSExp, isCompoundSExp as isL3CompoundSExp, isEmptySExp as isL3EmptySExp,
    makeSymbolSExp as makeL3SymbolSExp, makeCompoundSExp as makeL3CompoundSExp, makeEmptySExp as makeL3EmptySExp
} from './L3/L3-value'
import * as fs from 'fs';
import * as path from 'path';

import { makeOk, makeFailure, isOk, isFailure} from './shared/result'

import {
    isProgram as isL32Program, isDefineExp as isL32DefineExp, isCExp as isL32CExp, isAppExp as isL32AppExp, isIfExp as isL32IfExp, isProcExp as isL32ProcExp, isLetExp as isL32LetExp, isLitExp as isL32LitExp,
    isNumExp as isL32NumExp, isBoolExp as isL32BoolExp, isStrExp as isL32StrExp, isPrimOp as isL32PrimOp, isVarRef as isL32VarRef, isDictExp,
    Program as L32Program, CExp as L32CExp, Exp as L32Exp,
    LitExp as L32LitExp, isAtomicExp as L32IsAtomicExp, makePrimOp as L32MakePrimOp, isVarDecl as L32IsVarDecl, Binding as L32Binding, isBinding as L32IsBinding,
    unparseL32, AppExp as L32AppExp, DictExp, DictEntry, VarDecl as L32VarDecl, VarRef as L32VarRef, Program as ProgramL32,
    makeProgram as makeL32Program, DefineExp as L32DefineExp, isVarDecl as isL32VarDecl, isBinding as isL32Binding,
    parseL32, 
} from './L32/L32-ast';

import {
    makeCompoundSExp as makeL32CompundSExp, makeEmptySExp as makeL32EmptySExp , makeSymbolSExp as makeL32SymbolSExp,
    SExpValue as L32SExpValue, CompoundSExp as L32CompoundSExp, SymbolSExp as L32SymbolSExp, EmptySExp as L32EmptySExp,
    isCompoundSExp as isL32CompoundSExp, isSymbolSExp as isL32SymbolSExp, isEmptySExp as isL32EmptySExp
} from './L32/L32-value';




import { map } from "ramda";
/*
Purpose: rewrite all occurrences of DictExp in a program to AppExp.
Signature: Dict2App (exp)
Type: Program -> Program
*/
export const Dict2App  = (exp: ProgramL32) : ProgramL3 => 
    makeL3Program(map(L32ExpToL3Exp, exp.exps));

const L32ExpToL3Exp = (exp: L32Exp): L3Exp =>
    isL32CExp(exp) ? L32CExpToL3CExp(exp) :
    isL32DefineExp(exp) ? L32DefineExpToL3DefineExp(exp) :
    exp

const L32DefineExpToL3DefineExp = (exp: L32DefineExp): L3DefineExp =>
    makeL3DefineExp(exp.var, L32CExpToL3CExp(exp.val))

const L32CExpToL3CExp = (exp: L32CExp): L3CExp =>
    isL32NumExp(exp) ? makeL3NumExp(exp.val) :
    isL32BoolExp(exp) ? makeL3BoolExp(exp.val) :
    isL32StrExp(exp) ? makeL3StrExp(exp.val) :
    isL32PrimOp(exp) ? makeL3PrimOp(exp.op) :
    isL32VarRef(exp) ? makeL3VarRef(exp.var) :
    isL32ProcExp(exp) ? makeL3ProcExp(exp.args, map(L32CExpToL3CExp, exp.body)) :
    isL32LitExp(exp) ? makeL3LitExp(L32SExpValueToL3SExpValue(exp.val)) :
    isL32AppExp(exp) ? makeL3AppExp(L32CExpToL3CExp(exp.rator), map(L32CExpToL3CExp, exp.rands)) :
    isL32IfExp(exp) ? makeL3IfExp(L32CExpToL3CExp(exp.test), L32CExpToL3CExp(exp.then), L32CExpToL3CExp(exp.alt)) :
    isL32LetExp(exp) ? makeL3LetExp(map(L32BindingToL3Binding, exp.bindings), map(L32CExpToL3CExp, exp.body)) :
    isDictExp(exp) ? makeL3AppExp(makeL3VarRef("dict"), [L32DictExpEntriesToL3LitExp(exp)]) :
    makeL3StrExp("unsupported")

const L32DictExpEntriesToL3LitExp = (exp: DictExp): L3LitExp =>
    makeL3LitExp(RecurMakeCompound(map(L32DictEntryToL3CompoundExp, exp.entries)))
    
const RecurMakeCompound = (entries: L3CompoundSExp[]) : L3SExpValue =>
    (entries.length === 0) ? makeL3EmptySExp() : makeL3CompoundSExp(entries[0], RecurMakeCompound(entries.slice(1)))

const L32DictEntryToL3CompoundExp = (entry: DictEntry) : L3CompoundSExp =>
    makeL3CompoundSExp(makeL3SymbolSExp(entry.key), EntryValToL3SExpValue(entry.val))

const EntryValToL3SExpValue = (val: L32CExp) : L3SExpValue =>
    isL32LitExp(val) ? L32SExpValueToL3SExpValue(val.val) :
    isL32CExp(val) ? CExpToL3SExpValue(val) :
    makeL3SymbolSExp("unsupported")

const CExpToL3SExpValue = (exp: L32CExp) : L3SExpValue => {
    const firstP = parse(unparseL32(exp))
    const secondP = (isOk(firstP) ? parseL3SExp(firstP.value) : "unsupported")
    return ((secondP === "unsupported") ? "unsupported" : (isOk(secondP) ? secondP.value : "unsupported"))
}


const L32SExpValueToL3SExpValue = (exp: L32SExpValue): L3SExpValue =>
    isL32SymbolSExp(exp) ? makeL3SymbolSExp(exp.val) :
    isL32CompoundSExp(exp) ? makeL3CompoundSExp(L32SExpValueToL3SExpValue(exp.val1), L32SExpValueToL3SExpValue(exp.val2)) :
    isL32EmptySExp(exp) ? makeL3EmptySExp() :
    makeL3SymbolSExp("unsupported")

const L32BindingToL3Binding = (exp: L32Binding): L3Binding =>
    makeL3Binding(exp.var.var, L32CExpToL3CExp(exp.val))



/*
Purpose: Transform L32 program to L3
Signature: L32ToL3(prog)
Type: Program -> Program
*/
export const L32toL3 = (prog : ProgramL32): ProgramL3 => {
    const q23Content = `(L3 (define duo 
                                    (lambda (dictio key func) 
                                            (if (eq? dictio '())
                                                    "key not found"
                                                    (if (eq? (car (car dictio)) key)
                                                        (cdr (car dictio))
                                                        (func (cdr dictio) key)
                                                        ))))
                            (define dict 
                                (lambda (key) 
                                    (lambda (value) 
                                        (duo key value duo)
                            )))
    
                            )`;
    const q23Parsed = parseL3(q23Content);
    return isOk(q23Parsed) ? makeL3Program([...q23Parsed.value.exps, ...Dict2App(prog).exps]) : makeL3Program([]);
}
    
    

    