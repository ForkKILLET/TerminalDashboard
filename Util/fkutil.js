// :: Info
//    NAME      ForkKILLET's Utilities (fkutil)
//    AUTHOR    ForkKILLET

// :: Main

// :::: Ext     lv.0

Error.em = (title, msg) => Error(`\x1B[31m[${title}] ${msg}\x1B[0m`)
Error.unreachable = () => Error.em("???", "It's unreachable! You can never see this f**king error!")

Date.prototype.fommat = function(f, UTC) {
    UTC = UTC ? "UTC" : ""
    const re = {
        "y+": this[`get${UTC}FullYear`](),
        "m+": this[`get${UTC}Month`]() + 1,
        "d+": this[`get${UTC}Date`](),
        "H+": this[`get${UTC}Hours`](),
        "M+": this[`get${UTC}Minutes`](),
        "S+": this[`get${UTC}Seconds`](),
        "s" : this[`get${UTC}Milliseconds`]()
    }
    for (let r in re) if (RegExp(`(${r})`).test(f))
        f = f.replace(RegExp.$1,
            ("000" + re[r]).substr((re[r].toString()).length + 3  - RegExp.$1.length)
        )
    return f
}
Date.fromTimeZone = n => new Date(Date.now() + n * 60 * 60 * 1000)

// :::: Tool    lv.0

function keyOf(key, src, dftKey) {
    return (src ? src[key] : null) ?? src[dftKey]
}

class _c_this {
    basicT      = (t, x) => typeof x === t
    _w_basicT   = t => x => this.basicT(t, x)

    string      = this._w_basicT("string")
    str         = this.string

    number      = this._w_basicT("number")
    num         = this.number

    bigint      = this._w_basicT("bigint")

    func        = this._w_basicT("function")
    fun         = this.func

    //////////

    judge       = (x, mode, final) => {
        if (! this.func(mode)) {
            mode = keyOf(mode, {
                any: (r, p) => [ p || r, r ], // TODO: More efficiently short circuit.
                all: (r, p) => [ (p || p === null) && r, r === -1 ],
                non: (r, p) => [ (p || p === null) && !r, false ]
            }, "all")
        }
        if (! this.func(final)) {
            final = keyOf(final, {
                assert: p => {
                    if (!r) throw Error.em("Is.judge",
                        `Assert failed; Rule: ${rule}; More assert info: see IsC.`)
                    return true
                },
                result: p => p
            }, "result")
        }

        const IsA = { _ignore: false, _pass: null, q() { return final(this._pass) } }
        for (let i in this) {
            if (i[0] === "_" || i === "judge") continue
            else if (this.func(this[i])) IsA[i] = (...p) => {
                if (! IsA._ignore)
                    [ IsA._pass, IsA._ignore ] = mode(this[i](x, ...p), IsA._pass)
                return IsA
            }
        }
        return IsA
    }
    j           = this.judge
    
    //////////

    instcOf     = (i, x) => x instanceof i
    _w_instcOf   = i => x => this.instcOf(i, x)

    regexp      = this._w_instcOf(RegExp)
    re          = this.regexp

    array       = this._w_instcOf(Array)
    arr         = this.array

    date        = this._w_instcOf(Date)

    //////////

    nan         = x => isNaN(x)
    int         = x => Is.number(x) && (x % 1 === 0)

    pos         = x => Is.number(x) && x > 0
    pos0        = x => Is.number(x) && x >= 0
    neg         = x => Is.number(x) && x < 0
    neg0        = x => Is.number(x) && x <= 0
    
    numstr      = x => Is.number(x) || (Is.string(x) && !Is.nan(Number(x)))
    
    //////////

    nul         = x => x === null
    undef       = x => x === undefined
    empty       = x => x == null
    fake        = x => !x

    //////////

    among       = (x, arr) => !! arr?.includes(x)

    //////////

    checkby     = (x, f) => f(x)
}
const Is = new _c_this()

// :::: Ext     1v.1

Object.clone = src => {
    if (Is.judge(src, "any").num().str().fun().bigint().empty().re().q()) return src
    
    const res = Is.arr(src) ? [] : {}
    for (let i in src) res[i] = Object.clone(src[i])
    return res
}

// :::: Tool    lv.2

const EF = _ => {}
function CP(param, name) {
// TODO: info for one-pass check
//       e.g. (for nullable) Param p requires null or ...
// Note: Since I have `Is`, then what can this do?
// TODO: Refactor with Is
    return {
        _err(errType, require, exact) {
            throw Error.em("CP", `Param ${name} requires ${errType} ${require}, but got ${exact}.`)
        },
        o: param,
        n: name,
        _pass: false,

        nullable() { if (this._pass) return this
            if (this.o == null) this._pass = true
            return this
        },
        type(ts, soft) { if (this._pass) return this
            const tt = typeof this.o
            if (! Array.isArray(ts)) ts = [ ts ]
            let f = false
            for (let t of ts) {
                f = f || (t === tt)
                if (soft) {
                    if ((tt === "null" || tt === "undefined") && this.o == null) f = true
                    else if (tt === "number" && t === "string") {
                        this.o = this.o.toString(); f = true
                    }
                    else if (tt === "string" && t === "number" && Is.numstr(this.o)) {
                        this.o = Number(this.o); f = true
                    }
                }
                if (f) break
            }
            return f ? this : this._err("type", `[${ts.join(" ")}]`, `[${typeof p}]`)
        },
        ctype(c) { if (this._pass) return this
            return (this.o instanceof c) ? this : this._err("class", `[${c.name}]`, `[${Object.getPrototypeOf(this.o).constructor.name}]`)
        },

        lt(n, eq) { if (this._pass) return this
            return (this.o < n || eq && this.o == n) ? this : this._err("math range", `p ${eq ? "<=" : "<"} ${n}`, this.o )
        },
        gt(n, eq) { if (this._pass) return this
            return (this.o > n || eq && this.o == n) ? this : this._err("math range", `p ${eq ? ">=" : ">"} ${n}`, this.o)
        },
        ltg(l, r) { if (this._pass) return this
            return (this.o > l && this.o < r) ? this : this._err("range", `${l} < p < ${r}`, this.o)
        },
        leg(l, r) { if (this._pass) return this
            return (this.o >= l && this.o <= r) ? this : this._err("range", `${l} <= p <= ${r}`, this.o)
        },
        pos() { if (this._pass) return this
            return this.gt(0) },
        pos0() { if (this._pass) return this
            return this.gt(0, true) },
        neg() { if (this._pass) return this
            return this.lt(0) },
        neg0() { if (this._pass) return this
            return this.lt(0, true) },

        len(l, r) { if (this._pass) return this
            let n = this.o?.length
            if (n == null) this._err("length", "...", "N/A")
            return r == null
                ? (n === l ? this : this._err("length", `l = ${l}`, n))
                : (n >= l && n <= r ? this : this._err("length", `${l} <= l <= ${r}`))
        },

        eq(n) { if (this._pass) return this
            return (this.o == n) ? this : this._err("range", `p = ${n}`, this.o)
        },
        justeq(n) { if (this._pass) return thiys
            if (n === this.o) this._pass = true
            return this
        },
        in(a) { if (this._pass) return this
            return (a.includes(this.o)) ? this : this._err("range in", "\n" + JSON.stringify(a, null, 4) + "\n", this.o)
        },
        justin(a) { if (this._pass) return this
            if (a.includes(this.o)) this._pass = true
            return this
        }
    }
}

async function ajax(tar, encode = "utf8", http_) {
   return new Promise((resolve, reject) => {
        (http_ ?? require("http")).get(tar, res => {
            const { statusCode } = res
            const contentType = res.headers['content-type']

            if (statusCode !== 200) {
                res.resume()
                reject(new Error(`ajax: Request failed.\n` +
                    `Status Code: ${statusCode}\n` +
                    `URL: ${tar}`
                ))
            }

            let data = ""
            res.setEncoding(encode)
            res.on("data", chunk => data += chunk)
            res.on("end", () => resolve(data))
        })
    })
}

// :: Export

module.exports = {
    Is, EF, CP,
    ajax
}

