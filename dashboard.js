// :: Info
//    NAME      TerminalDashboard (TDB)
//    AUTHOR    ForkKILLET

// :: Import

// :: Tools

Number.isNumString = s => !isNaN(Number(s))


function CP(param) {
    return {
        _err(errType, require, exact) {
            throw Error(`\x1B[31m[CP] Require ${errType} ${require}, but got ${exact}\x1B[0m`)
        },
        o: param,

        type(t, soft) {
            const tp = typeof this.o
            let f = (tp === t)
            if (soft) {
                if ((tp === "null" || tp === "undefined") && this.o == null) f = true
                else if (tp === "number" && t === "string") {
                    this.o = this.o.toString(); f = true
                }
                else if (tp === "string" && t === "number" && Number.isNumString(this.o)) {
                    this.o = Number(this.o); f = true
                }
            }
            return f ? this : this._err("type", `[${t}]`, `[${typeof p}]`)
        },
        ctype(c) {
            return (this.o instanceof c) ? this : this._err("class", `[${c.name}]`, `[${Object.getPrototypeOf(this.o).constructor.name}]`)
        },

        lt(n, eq) {
            return (this.o < n || eq && this.o == n) ? this : this._err("math range", `p ${eq ? "<=" : "<"} ${n}`, this.o )
        },
        gt(n, eq) {
            return (this.o > n || eq && this.o == n) ? this : this._err("math range", `p ${eq ? ">=" : ">"} ${n}`, this.o) 
        }, 
        ltg(l, r) {
            return (this.o > l && this.o < r) ? this : this._err("range", `${l} < p < ${r}`, this.o)
        },
        pos()  { return this.gt(0) },
        pos0() { return this.gt(0, true) },
        neg()  { return this.lt(0) },
        neg0() { return this.lt(0, true) },


        eq(n) { // Note: who will use this?
            return (this.o == n) ? this : this._err("range", `p = ${n}`, this.o)
        },
        in(a) {
            return (a.includes(this.o)) ? this : this._err("range in", "\n" + JSON.stringify(a, null, 4) + "\n", this.o)
        }
    }
}


// :: Render

const
    RC = {
        black:      0,
        red:        1,
        green:      2,
        yellow:     3,
        blue:       4,
        magenta:    5,
        cyan:       6,
        silver:     7
    },
    RS = {
        plain:      0,
        bold:       1,
        faint:      2,
        italic:     3,
        underline:  4,
        blink:      5,
        // Note: no 6,
        reverse:    7,
        hide:       8
    };

let R = {
    _pos:   { x: 0, y: 0 },
    pos(x, y) { R._pos.x = x, R._pos.y = y; return R },
    apos(x, y) { R.pos(x, y); return R.apply() },

    _fgc: RC.black,
    fgc(c) { R._fgc = c; return R },
    afgc(c) { R.fgc(c); return R.apply() },

    _bgc: null,
    bgc(c) { R._bgc = c; return R },
    abgc(c) { R.bgc(c); return R.apply() },
    
    _styl: RS.plain,
    styl(b) { R._styl = b; return R },
    astyl(b) { R.styl(b); return R.apply() },

    use(a) {
        if (a) {
            R._pos = a.pos ?? R._pos
            R._pos.x = a.x ?? R._pos.x
            R._pos.y = a.y ?? R._pos.y
            R._fgc = a.fgc ?? R._fgc
            R._bgc = a.bgc ?? R._bgc
            R._styl = a.styl ?? R._styl
        }
        return R
    },

    _esc(p) {
        if (! Array.isArray(p)) p = [ p ]
        let f = false, res = ""
        for (let i of p)
            if (i != null) {
                res += (f ? ";" : "\x1B[") + i
                f = true
            }
        return f ? res + "m" : ""
    },

    apply(a, cb) {
        if (a) R.use(a)
        process.stdout.write(R._esc([ R._styl, R._fgc == null ? null : 30 + R._fgc, R._bgc == null ? null : 40 + R._bgc ]))
        if (typeof cb === "function") cb()
        return R
    },
    atemp(a, cb) {
        let o = {
            x: R._pos.x, y: R._pos.y,
            fgc: R._fgc, bgc: R._bgc,
            styl: R._styl
        }
        R.apply(a)
        cb()
        return R.apply(o)
    },

    reset() {
        process.stdout.write(R._esc(0))
        return R
    },
    pale() { // WWW: be climbed away
        R.reset()
        process.stdout.write("\n")
        return R
    },

    say(t) {
        process.stdout.write(t)
        return R
    }
}

// :: Zone

class TDBZone {
    constructor(root, len, width) {
        this.root   = CP(root).type("boolean").o
        // Note:
        //     l
        //   +--->
        // w |
        //   v   .
        this.len    = CP(len).type("number", true).pos().o
        this.width  = CP(width).type("number", true).pos().o
        
        this.pa = null
        this.subz = []
        if (this.root) { this.rx = 0; this.ry = 0 }
    }

    spot(x, y, R) {
        
    }

    zone = {
        mnt(z, x, y) {
            z   = CP(z).ctype(TDBZone).o
            x   = CP(x).type("number").pos().lt(this.len)
            y   = CP(y).type("number").pos().lt(this.width)

            z.rx = this.rx + x
            z.ry = this.ry + y
            z.pa = this
            
            this.subz.push(z)
            return this.subz.length - 1
        },
        rm(id) {
            // TODO
        }
    }
}

class ZBoard extends TDBZone {
    constructor(width, length, bg) {
        super(true, width ?? 100, length ?? 25)
        // TODO: bg
    }
}

class ZBar extends TDBZone {
    constructor(width, minW, overflow) {
        super(false, width, 1)
        this.minW       = CP(minW).type("number", true).pos().o
        this.overflow   = CP(overflow).type("string").in([ "trunc", "...", "error" ]).o
    }
}

// :: Debug

R
.astyl(RS.bold)
.afgc(RC.red)
.say("Ice")
.afgc(RC.blue)
.say("Lava")
.atemp(null, () => R
    .afgc(RC.black)
    .say(" in ")
)
.say("Terminal")
.pale()

const B = new ZBoard(30, 10)
// console.dir(new ZBar(3, 3, "trunc"))

