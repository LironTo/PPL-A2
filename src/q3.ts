import {
    Exp, Program,
    DefineExp, isProgram, isDefineExp,
    NumExp, isNumExp,
    BoolExp, isBoolExp,
    StrExp, isStrExp,
    VarRef, isVarRef,
    IfExp, isIfExp,
    ProcExp, isProcExp,
    AppExp, isAppExp,
    PrimOp, isPrimOp
  } from "./L3/L3-ast";
  import { Result, makeOk, makeFailure } from "./shared/result";
  
  /** sequence: collect an array of Result<T> into Result<T[]>, failing fast */
  const sequence = <T>(rs: Result<T>[]): Result<T[]> =>
    rs.reduce<Result<T[]>>(
      (acc, r) =>
        acc.tag === "Failure" ? acc
      : r.tag === "Failure"    ? r
      : makeOk([...acc.value, r.value]),
      makeOk([] as T[])
    );
  
  /** l2ToJS: L2‐AST → Result<string> */
  export const l2ToJS = (ast: Exp | Program): Result<string> =>
    // 1) Program: render each top-level exp, then add semicolon to all but last
    isProgram(ast)
      ? (() => {
          const partsR = sequence(ast.exps.map(l2ToJS));
          if (partsR.tag === "Failure") return partsR;
          const parts = partsR.value;
          const lines = parts.map((p, i) =>
            i < parts.length - 1 ? `${p};` : p
          );
          return makeOk(lines.join("\n"));
        })()
  
      // 2) define → no semicolon here (Program will add it)
      : isDefineExp(ast)
      ? (() => {
          const rhsR = l2ToJS(ast.val);
          return rhsR.tag === "Failure"
            ? rhsR
            : makeOk(`const ${ast.var.var} = ${rhsR.value}`);
        })()
  
      // 3) literals and vars
      : isNumExp(ast)   ? makeOk(ast.val.toString())
      : isBoolExp(ast)  ? makeOk(ast.val ? "true" : "false")
      : isStrExp(ast)   ? makeOk(JSON.stringify(ast.val))
      : isVarRef(ast)   ? makeOk(ast.var)
  
      // 4) if → `(<test> ? <then> : <else>)`
      : isIfExp(ast)
      ? (() => {
          const partsR = sequence([
            l2ToJS(ast.test),
            l2ToJS(ast.then),
            l2ToJS(ast.alt),
          ]);
          if (partsR.tag === "Failure") return partsR;
          const [t, c, e] = partsR.value;
          return makeOk(`(${t} ? ${c} : ${e})`);
        })()
  
      // 5) lambda → wrap the arrow in parentheses: `((x,y…) => body)`
      : isProcExp(ast)
      ? (() => {
          const bodyExp = ast.body[0];                 // exactly one expression
          const bodyR = l2ToJS(bodyExp);
          if (bodyR.tag === "Failure") return bodyR;
          const params = ast.args.map(p => p.var).join(",");
          return makeOk(`((${params}) => ${bodyR.value})`);
        })()
  
      // 6) application
      : isAppExp(ast)
      ? (() => {
          // 6a) primitive op → infix or special form
          if (isPrimOp(ast.rator)) {
            const argsR = sequence(ast.rands.map(l2ToJS));
            if (argsR.tag === "Failure") return argsR;
            const args = argsR.value;
            switch (ast.rator.op) {
              case "+": case "-": case "*": case "/":
              case "<": case ">":
                return makeOk(`(${args.join(` ${ast.rator.op} `)})`);
              case "=":
                return makeOk(`(${args.join(" === ")})`);
              case "and":
                return makeOk(`(${args.join(" && ")})`);
              case "or":
                return makeOk(`(${args.join(" || ")})`);
              case "not":
                return makeOk(`(!${args[0]})`);
              case "number?":
                return makeOk(`(typeof ${args[0]} === "number")`);
              case "boolean?":
                return makeOk(`(typeof ${args[0]} === "boolean")`);
              case "eq?":
                return makeOk(`(${args[0]} === ${args[1]})`);
              default:
                return makeFailure(`Unknown primitive: ${ast.rator.op}`);
            }
          }
          // 6b) normal function call → `f(arg1,arg2,…)`
          else {
            const funR = l2ToJS(ast.rator);
            if (funR.tag === "Failure") return funR;
            const argsR = sequence(ast.rands.map(l2ToJS));
            if (argsR.tag === "Failure") return argsR;
            return makeOk(`${funR.value}(${argsR.value.join(",")})`);
          }
        })()
  
      // 7) unexpected node
      : makeFailure(`l2ToJS: unexpected AST node ${JSON.stringify(ast)}`);
  