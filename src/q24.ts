import {
    Exp, Program, isProgram, isDefineExp, isAtomicExp, isLitExp, isIfExp,
    isProcExp, isAppExp, isLetExp, isDictExp,
    makeProgram, makeDefineExp as makeL32DefineExp, makeIfExp, makeProcExp,
    makeAppExp, makeLetExp, makeBinding, makeLitExp, makeVarRef, makeVarDecl, CExp
} from "./L32/L32-ast";

import {
    makeSymbolSExp, makeEmptySExp, makeCompoundSExp, SExpValue
} from "./L3/L3-value";

import {
    Program as L3Program, Exp as L3Exp, makeProgram as makeL3Program,
    makeDefineExp as makeL3DefineExp, makeProcExp as makeL3ProcExp,
    makeAppExp as makeL3AppExp, makeIfExp as makeL3IfExp,
    makeVarRef as makeL3VarRef, makeVarDecl as makeL3VarDecl
} from "./L3/L3-ast";

import { isNumExp, isBoolExp, isStrExp, isPrimOp, isVarRef } from "./L32/L32-ast";

// ממיר ערך של ביטוי מילון לערך SExp
const expToSExpValue = (e: CExp): SExpValue => {
    if (isNumExp(e)) return e.val;
    if (isBoolExp(e)) return e.val;
    if (isStrExp(e)) return e.val;
    if (isPrimOp(e)) return e;
    if (isVarRef(e)) return makeSymbolSExp(e.var);
    if (isLitExp(e)) return (e as any).val;
    throw new Error(`Unsupported dict value in transformation: ${JSON.stringify(e)}`);
};

// ממיר רשימת entries של מילון ל־CompoundSExp ב־L3
const transformDictEntriesToQuotedList = (entries: { key: string; val: CExp }[]): SExpValue =>
    entries.reduceRight<SExpValue>(
        (acc, { key, val }) =>
            makeCompoundSExp(
                makeCompoundSExp(makeSymbolSExp(key), expToSExpValue(val)),
                acc
            ),
        makeEmptySExp()
    );

// ממיר ביטויי dict ל־AppExp חוקי, ומחליף את כל המופעים בתוכנית
export const Dict2App = (exp: Program | Exp): Program | Exp =>
    isAtomicExp(exp) || isLitExp(exp)
        ? exp
        : isIfExp(exp)
        ? makeIfExp(Dict2App(exp.test) as CExp, Dict2App(exp.then) as CExp, Dict2App(exp.alt) as CExp)
        : isProcExp(exp)
        ? makeProcExp(exp.args, exp.body.map(b => Dict2App(b) as CExp))
        : isAppExp(exp)
        ? makeAppExp(Dict2App(exp.rator) as CExp, exp.rands.map(r => Dict2App(r) as CExp))
        : isLetExp(exp)
        ? makeLetExp(
            exp.bindings.map(b => makeBinding(b.var.var, Dict2App(b.val) as CExp)),
            exp.body.map(b => Dict2App(b) as CExp)
        )
        : isDefineExp(exp)
        ? makeL32DefineExp(exp.var, Dict2App(exp.val) as CExp)
        : isDictExp(exp)
        ? makeAppExp(makeVarRef("dict"), [makeLitExp(transformDictEntriesToQuotedList(exp.entries))])
        : isProgram(exp)
        ? makeProgram(exp.exps.map(Dict2App) as Exp[])
        : exp;

// יוצר הגדרה עבור get בלשון L3
const makeGetDefine = (): L3Exp =>
    makeL3DefineExp(
        makeL3VarDecl("get"),
        makeL3ProcExp(
            [makeL3VarDecl("pairs"), makeL3VarDecl("key")],
            [makeL3IfExp(
                makeL3AppExp(makeL3VarRef("eq?"), [
                    makeL3AppExp(makeL3VarRef("car"), [
                        makeL3AppExp(makeL3VarRef("car"), [makeL3VarRef("pairs")])
                    ]),
                    makeL3VarRef("key")
                ]),
                makeL3AppExp(makeL3VarRef("cdr"), [
                    makeL3AppExp(makeL3VarRef("car"), [makeL3VarRef("pairs")])
                ]),
                makeL3AppExp(makeL3VarRef("get"), [
                    makeL3AppExp(makeL3VarRef("cdr"), [makeL3VarRef("pairs")]),
                    makeL3VarRef("key")
                ])
            )]
        )
    );

// יוצר הגדרה עבור dict שמחזירה פונקציית חיפוש
const makeDictDefine = (): L3Exp =>
    makeL3DefineExp(
        makeL3VarDecl("dict"),
        makeL3ProcExp(
            [makeL3VarDecl("pairs")],
            [makeL3ProcExp(
                [makeL3VarDecl("key")],
                [makeL3AppExp(makeL3VarRef("get"), [makeL3VarRef("pairs"), makeL3VarRef("key")])]
            )]
        )
    );

// ממיר תוכנית L32 לתוכנית L3 תקינה
export const L32toL3 = (exp: Program): L3Program => {
    const transformed = Dict2App(exp) as Program;
    return makeL3Program([
        makeGetDefine(),
        makeDictDefine(),
        ...(transformed.exps as L3Exp[])
    ]);
};
