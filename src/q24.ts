import {
    isProgram, isDefineExp, isCExp, isAppExp, isIfExp, isProcExp, isLetExp, isLitExp,
    isNumExp, isBoolExp, isStrExp, isPrimOp, isVarRef, isDictExp,
    Program as L32Program, CExp as L32CExp, Exp as L32Exp
} from './L32/L32-ast';

import {
    SExpValue as L32SExpValue
} from './L32/L32-value';

import {
    makeProgram, makeDefineExp, makeAppExp, makeLitExp, makeVarRef, makeVarDecl,
    makeIfExp, makeProcExp, makeLetExp, makeBinding,
    Program, CExp, Exp
} from './L3/L3-ast';

import {
    makeCompoundSExp, makeEmptySExp, makeSymbolSExp,
    SExpValue, CompoundSExp
} from './L3/L3-value';

import { map } from "ramda";

// Converts L32 SExpValue to L3 SExpValue
const valueToL3SExp = (val: L32SExpValue): SExpValue => {
    if (typeof val === "number" || typeof val === "boolean" || typeof val === "string") return val;
    if (val.tag === "SymbolSExp") return makeSymbolSExp(val.val);
    if (val.tag === "EmptySExp") return makeEmptySExp();
    if (val.tag === "CompoundSexp") return makeCompoundSExp(valueToL3SExp(val.val1), valueToL3SExp(val.val2));
    throw new Error(`Unsupported SExpValue: ${JSON.stringify(val)}`);
};

// Converts L32.CExp to SExpValue (for quoted literals)
const convertCExpToSExpValue = (exp: L32CExp): SExpValue => {
    if (isNumExp(exp)) return exp.val;
    if (isBoolExp(exp)) return exp.val;
    if (isStrExp(exp)) return exp.val;
    if (isVarRef(exp)) return makeSymbolSExp(exp.var);
    if (isPrimOp(exp)) return makeSymbolSExp(exp.op);
    if (isLitExp(exp)) return valueToL3SExp(exp.val);
    if (isDictExp(exp)) return dictToSExpList(exp.entries);
    return makeSymbolSExp("unsupported");
};

// Converts dictionary entries to quoted dotted list structure
const dictToSExpList = (entries: { key: string; val: L32CExp }[]): CompoundSExp => {
    const pairs: CompoundSExp[] = entries.map(entry =>
        makeCompoundSExp(
            makeSymbolSExp(entry.key),
            convertCExpToSExpValue(entry.val)
        )
    );

    let result: CompoundSExp = makeCompoundSExp(pairs[pairs.length - 1], makeEmptySExp());
    for (let i = pairs.length - 2; i >= 0; i--) {
        result = makeCompoundSExp(pairs[i], result);
    }
    return result;
};

// Transforms any L32.CExp to L3.CExp
const transformCExp = (exp: L32CExp): CExp =>
    isAppExp(exp)
        ? makeAppExp(transformCExp(exp.rator), map(transformCExp, exp.rands))
        : isIfExp(exp)
        ? makeIfExp(transformCExp(exp.test), transformCExp(exp.then), transformCExp(exp.alt))
        : isProcExp(exp)
        ? makeProcExp(exp.args, map(transformCExp, exp.body))
        : isLetExp(exp)
        ? makeLetExp(
            exp.bindings.map(b => makeBinding(b.var.var, transformCExp(b.val))),
            map(transformCExp, exp.body)
        )
        : isDictExp(exp)
        ? makeAppExp(makeVarRef("dict"), [makeLitExp(dictToSExpList(exp.entries))])
        : isLitExp(exp)
        ? makeLitExp(valueToL3SExp(exp.val))
        : exp as CExp; // Atomic expressions are structurally the same

// Transforms an L32.Program into an L3.Program
export const L32toL3 = (prog: Program): Program =>
    makeProgram(prog.exps.map(exp =>
        isDefineExp(exp)
            ? makeDefineExp(exp.var, transformCExp(exp.val))
            : isCExp(exp)
            ? transformCExp(exp)
            : exp as Exp
    ));
