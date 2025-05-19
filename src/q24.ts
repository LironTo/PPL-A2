import {
    Exp, Program, isProgram, isDefineExp, isAtomicExp, isLitExp, isIfExp,
    isProcExp, isAppExp, isLetExp, isDictExp,
    makeProgram, makeDefineExp, makeIfExp, makeProcExp, makeAppExp,
    makeLetExp, makeBinding, makeLitExp, makeVarRef, CExp
} from "./L32/L32-ast";

import {
    makeSymbolSExp, makeEmptySExp, makeCompoundSExp, SExpValue, CompoundSExp
} from "./L3/L3-value";

import {
    Program as L3Program, Exp as L3Exp, makeProgram as makeL3Program
} from "./L3/L3-ast";

// המרה של ערך מילון (value ב־CExp) ל־SExpValue
const expToSExpValue = (e: CExp): SExpValue => {
    if ((e as any).tag === "LitExp") return (e as any).val;
    if ((e as any).tag === "VarRef") return makeSymbolSExp((e as any).var);
    throw new Error(`Unsupported dict value in transformation: ${JSON.stringify(e)}`);
};

// מקבל entries של dict ומחזיר CompoundSExp עם quote של ((a . 1) (b . 2))
const transformDictEntriesToQuotedList = (entries: { key: string; val: CExp }[]): SExpValue => {
    const convertEntry = (key: string, val: CExp): SExpValue =>
        makeCompoundSExp(
            makeSymbolSExp(key),
            expToSExpValue(val)
        );

    return entries.reduceRight<SExpValue>(
        (acc, { key, val }) =>
            makeCompoundSExp(convertEntry(key, val), acc),
        makeEmptySExp()
    );
};

// פונקציה ראשית שממירה DictExp ל־AppExp עם (dict '((a . 1) ...))
export const Dict2App = (exp: Program | Exp): Program | Exp =>
    isAtomicExp(exp) || isLitExp(exp)
        ? exp
        : isIfExp(exp)
        ? makeIfExp(Dict2App(exp.test) as CExp, Dict2App(exp.then) as CExp, Dict2App(exp.alt) as CExp)
        : isProcExp(exp)
        ? makeProcExp(exp.args, exp.body.map(e => Dict2App(e) as CExp))
        : isAppExp(exp)
        ? makeAppExp(Dict2App(exp.rator) as CExp, exp.rands.map(e => Dict2App(e) as CExp))
        : isLetExp(exp)
        ? makeLetExp(
              exp.bindings.map(b => makeBinding(b.var.var, Dict2App(b.val) as CExp)),
              exp.body.map(e => Dict2App(e) as CExp)
          )
        : isDefineExp(exp)
        ? makeDefineExp(exp.var, Dict2App(exp.val) as CExp)
        : isDictExp(exp)
        ? makeAppExp(makeVarRef("dict"), [makeLitExp(transformDictEntriesToQuotedList(exp.entries))])
        : isProgram(exp)
        ? makeProgram((exp.exps.map(Dict2App) as Exp[]))
        : exp;

// הופך תוכנית שלמה מ־L32 לתוכנית חוקית בשפת L3
export const L32toL3 = (exp: Program): L3Program => {
    const transformed = Dict2App(exp);
    return makeL3Program((transformed as Program).exps as unknown as L3Exp[]);
};
