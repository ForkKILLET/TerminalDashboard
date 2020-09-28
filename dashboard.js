// :: Info
//    NAME          TerminalDashboard (TDB)
//    AUTHOR        ForkKILLET

// :: Import

const keypress      = require("keypress")
const tty           = require("tty")
const {
    Is, CP
}                   = require("./Util/fkutil")

const debug = true

// :: Re[na]der

const
    RC = {
        black:      0,      grey:       8,
        red:        1,      Lred:       9,
        green:      2,      Lgreen:     10,
        yellow:     3,      Lyellow:    11,
        blue:       4,      Lblue:      12,
        magenta:    5,      Lmagenta:   13,
        cyan:       6,      Lcyan:      14,
        silver:     7,      Lsilver:    15,

        sky:        195,
        white:      231,    snow:       255
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
        hide:       8,

        _all: [ 1, 2, 3, 4, 5, 7, 8 ]
    };

let R = {
    _pos: { x: null, y: null },
    pos(x, y) {
        if (Is.objR(x)) { R._pos.x = x.x; R._pos.y = x.y }
        else { R._pos.x = x; R._pos.y = y}
        return R
    },
    apos(x, y) { R.pos(x, y); return R.apply() },

    _fgc: RC.black,
    fgc(c) { R._fgc = c; return R },
    afgc(c) { R.fgc(c); return R.apply() },

    _bgc: RC.white,
    bgc(c) { R._bgc = c; return R },
    abgc(c) { R.bgc(c); return R.apply() },
    
    _styl: RS.plain,
    styl(b) { R._styl = b; return R },
    astyl(b) { R.styl(b); return R.apply() },

    use(a) {
        if (a) {
            R._pos      = a.pos     ?? R._pos
            R._pos.x    = a.x       ?? R._pos.x
            R._pos.y    = a.y       ?? R._pos.y
            R._fgc      = a.fgc     ?? R._fgc
            R._bgc      = a.bgc     ?? R._bgc
            R._styl     = a.styl    ?? R._styl
        }
        return R
    },

    _esc(p, t) {
        if (! Array.isArray(p)) p = [ p ]
        let f = false, res = ""
        for (let i of p)
            if (i != null) {
                res += (f ? ";" : "\x1B[") + i
                f = true
            }
        return f ? res + t : ""
    },

    apply(a, cb) {
        if (a) R.use(a)
        process.stdout.write(                           // Note:
            R._esc([R._pos.y + 1, R._pos.x + 1], "H") + // Set cursor position (y, x)
            R._esc([
                0,                                      // Clear appearance settings
                R._styl,                                // Set style
                38, 5,                                  // Set foreground color (256)
                (R._fgc == null ? null : R._fgc),
                48, 5,                                  // Set background color (256)
                (R._bgc == null ? null : R._bgc)
            ], "m")
        )
        if (Is.fun(cb)) cb()
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
        process.stdout.write(R._esc(0, "m"))
        return R
    },
    clear() {
        process.stdout.write(R._esc("2", "J"))
        return R
    },
    say(t) {
        process.stdout.write(t)
        return R
    },
    
    read: {
        _rs: [],
        _find(n) {
            for (let i in R.read._rs)
                if (R.read._rs[i]?.name === n) return [ i, R.read._rs[i] ]
            return [ -1, null ]
        },
        add(d, cb) {
            d = CP(d, "R.read.add^d#descriptor").type([ "boolean", "object" ]).o
            R.read._rs.push((ch, info) => {
                if (d === true) cb(ch, info)
                else if (Is.objR(d)) {
                    if (! d.hang                    &&

                        ! (d.ctrl ^ info?.ctrl)     &&
                        ! (d.shift ^ info?.shift)   &&
                        ! (d.meta ^ info?.meta)     && // Note: almost useless

                        (! d.key || d.key === ch)             &&
                        (! d.name || d.name === info.name)    &&
                        (! d.seq || d.seq === info.sequence)
                    ) cb(ch, info)
                }
            })
        },
        hang(n) {
            const [, r ] = this._find(n)
            return i == -1 ? false : (r ? (r.hang = true) : false)
        },
        unhang(n) {
            const [, r ] = this._find(n)
            return i == -1 ? false : (r ? (r.hang = false, true) : false)
        },
        rm(n) {
            const [i] = this._find(n)
            return i == -1 ? false : (R.read._rs.splice(i, 1), true)
        }
    },

    go(clearNow, goCb, paleCb) {
        if (clearNow) R.clear()
        
        let i = process.stdin
        keypress(i)
        i.on("keypress", (ch, info) => {
            for (let f of R.read._rs) f(ch, info)
        })
        i.setRawMode(true)
        i.resume()

        R.read.add({
            name: "exit",
            ctrl: true, name: "c"
        }, () => {
            R.pale(true)
            if (Is.fun(paleCb)) paleCb()
            process.exit()
        })
        
        if (Is.fun(goCb)) goCb()

        return R
    },
    pale(clearNow) { // wWw: be climbed away
        R.reset()
        if (clearNow) R.clear()
        process.stdout.write("\n")
        return R
    },
    sleep(time) {
        return new Promise(resolve => setTimeout(resolve, time))
    },

    _test() {
        R
        .go()
        .clear()
        .apos(0, 0)
        .say("\n".repeat(10 - 1) + "<C-c> exit", {})
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
    }
}

// :: Zone

class Zone {
    constructor(root, len, hei) {
        this.root   = CP(root, "Zone.constructor^root#is root zone").type("boolean").o
        // Note:
        //     l
        //   +--->
        // w |
        //   v   .
        this.len    = CP(len, "Zone.constructor^len").type("number", true).pos().o
        this.hei  = CP(hei, "Zone.constructor^length").type("number", true).pos().o
        
        this.pa = null
        this.subz = []
        if (this.root) { this.rx = 0; this.ry = 0 }
    }

    spot(ch, x, y, Ra) {
        if (! this.pa && ! this.root) throw Error.em("Zone.spot", "Unmounted and non-root zone.")

        ch  = CP(ch, "Zone:.spot^ch").type("string").len(1).o
        x   = CP(x, "Zone:.spot^x").type("number").pos0().lt(this.len).o
        y   = CP(y, "Zone:.spot^y").type("number").pos0().lt(this.hei).o
        Ra  = CP(Ra, "Zone:.spot^Ra#Render attribute").nullable().type("object").o

        const Ra_ = Object.assign({}, Ra, { x: this.rx + x, y: this.ry + y, bgc: this._bgc })
        R.atemp(Ra_, () => R.say(ch))
    }

    line(ch, P1, P2, Ra) {
        if (! this.pa && ! this.root) throw Error.em("Zone.spot", "Unmounted and non-root zone.")
        if (! P2) this.spot(ch, P1.x, P1.y, Ra)
        else if (P1.x === P2.x) {
            const
                yB = Math.min(P1.y, P2.y),
                yE = Math.max(P1.y, P2.y),
                x = P1.x
            for (let yi = yB; yi <= yE; yi++) this.spot(ch, x, yi, Ra)
        }
        else if (P1.y === P2.y) {
            const
                xB = Math.min(P1.x, P2.x),
                xE = Math.max(P1.x, P2.x),
                y = P1.y
            for (let xi = xB; xi <= xE; xi++) this.spot(ch, xi, y, Ra)
        }
        else ; // TODO: Oblique line
    }

    _bgc = null
    bgcDft(c) {
        this._bgc = CP(c, "Zone:.bgcDft^c#color code").type("number").o

        for (let il = 0; il < this.len; il++) // FIXME: it seems go wrong here...
        for (let iw = 0; iw < this.hei; iw++)
            this.spot(" ", il, iw, null)
    }

    border(b) {
        const _b = {
            topLeft:        { ch: "╭", req: [ "topEdge", "leftEdge" ]                        ,
                              from: [ "topLeft", 0, 0 ]                                     },
            topEdge:        { ch: "─", d:   d => { d.topLeft.y++;    d.topRight.y++         },
                              from: [ "topLeft", 1, 0 ],    to: [ "topRight", -1, 0 ]       },
            topRight:       { ch: "╮", req: [ "topEdge", "rightEdge" ]                       ,
                              from: [ "topRight", 0, 0 ]                                    },
            leftEdge:       { ch: "│", d:   d => { d.topLeft.x++;    d.bottomLeft.x++       },
                              from: [ "topLeft", 0, 1 ],    to: [ "bottomLeft", 0, -1 ]     },
            rightEdge:      { ch: "│", d:   d => { d.topRight.x--;   d.bottomRight.x--      },
                              from: [ "topRight", 0, 1 ],   to: [ "bottomRight", 0, -1 ]    },
            bottomLeft:     { ch: "╰", req: [ "bottomEdge", "leftEdge" ]                     ,
                              from: [ "bottomLeft", 0, 0 ]                                  },
            bottomEdge:     { ch: "─", d:   d => { d.bottomLeft.y--; d.bottomRight.y--      },
                              from: [ "bottomLeft", 1, 0 ], to: [ "bottomRight", -1, 0 ]    },
            bottomRight:    { ch: "╯", req: [ "bottomEdge", "rightEdge" ]                    ,
                              from: [ "bottomRight", 0, 0 ]                                 }
        }
        
        for (let i in _b) b[i] = (b[i] === undefined ? { ch: _b[i].ch } : b[i])

        if (b && Is.obj(b)) for (let i in _b) {
            // Note: Make nearby empty edge(s) blank when some corner is not empty.
            if (_b[i].req) {
                if (! b[i]?.ch) for (let j in [ 0, 1 ])
                if (! b[_b[i].req[j]]?.ch) b[_b[i].req[j]].ch = " "
            }
            // Note: Get border delta.
            if (_b[i].d) _b[i].d(this.pos._bd)
            // Note: Paint
            this.line(b[i].ch,
                this.pos[_b[i].from[0]](_b[i].from[1], _b[i].from[2], false),
                _b[i].to ? this.pos[_b[i].to[0]](_b[i].to[1], _b[i].to[2], false) : null,
                b[i].Ra
            )
        }
    }

    pos = {
        _df: (ddx, ddy, n) => (dx, dy, border = true) => ({
            x: this.rx + (dx ?? 0) + this.pos._d[n].x + (Is.str(ddx) ? this[ddx] : ddx) + (border ? this.pos._bd[n].x : 0),
            y: this.ry + (dy ?? 0) + this.pos._d[n].y + (Is.str(ddy) ? this[ddy] : ddy) + (border ? this.pos._bd[n].y : 0)
        }),
        _bd: {
            topLeft:        { x: 0, y: 0 },
            topRight:       { x: 0, y: 0 },
            bottomLeft:     { x: 0, y: 0 },
            bottomRight:    { x: 0, y: 0 }
        },
        _d: {
            topLeft:        { x: 0, y: 0 },
            topRight:       { x: -1, y: 0 },
            bottomLeft:     { x: 0, y: -1 },
            bottomRight:    { x: -1, y: -1 }
        },
        topLeft:        (...p) => (this.pos._df(0,     0,      "topLeft"))      (...p),
        topRight:       (...p) => (this.pos._df("len", 0,      "topRight"))     (...p),
        bottomLeft:     (...p) => (this.pos._df(0,     "hei",  "bottomLeft"))   (...p),
        bottomRight:    (...p) => (this.pos._df("len", "hei",  "bottomRight"))  (...p)
    }

    zone = {
        mnt: (z, x, y) => {
            if (Is.objR(x)) { y = x.y; x = x.x }

            z = CP(z, "Zone:.zone.mnt^z#TDB zone").ctype(Zone).o
            x = CP(x, "Zone:.zone.mnt^x").type("number").pos0().lt(this.len).o
            y = CP(y, "Zone:.zone.mnt^y").type("number").pos0().lt(this.hei).o

            z.rx = this.rx + x
            z.ry = this.ry + y
            z.pa = this

            z.on("mnt")()
            
            this.subz.push(z)
            return this.subz.length - 1
        },
        um: id => {
            // TODO
        }
    }

    _on = {
        mnt: null
    }
    on(evt, f) {
        if (Is.fun(f)) this._on[evt] = f
        else return this._on[evt] ?? EF
    }
}

class ZBoard extends Zone {
    constructor(hei, len, bgc) {
        super(true, hei ?? 100, len ?? 25)
        
        bgc = CP(bgc, "ZBoard").leg(0, 255).o
        this.bgcDft(bgc, true)
    }
}

class ZBar extends Zone {
    constructor(len, stretch, overflow) {
        super(false, len, 1)
        this.overflow   = CP(overflow, "ZBar.constructor^overflow#overflow behavior").type("string").in([ "trunc", "...", "error" ]).o
        this.stretch    = CP(stretch, "ZBar.constructor^stretch#if stretch").type("boolean").o

        if (this.stretch) this.on("mnt", () => this.len =
            this.pa.len - this.pa.pos._bd.topLeft.x + this.pa.pos._bd.topRight.x)
    }
    
    #t = ""
    text(t, Ra) {
        if (t) {
            if (t.length > this.len) {
                switch (this.overflow) {
                    case "trunc":
                        t = t.substring(0, this.len)
                        break
                    case "...":
                        t = (t.substring(0, this.len - 3) + "...").substring(0, this.len)
                        break
                    case "error":
                        throw Error.em("ZBar.text", `Text length: ${t.length}, overflows. ZBar length: ${this.len}`)
                        break
                    default:
                        throw Error.unreachable()
                }
            }
            t = t + " ".repeat(this.len - t.length)
            this.#t = t
            for (let i = 0; i < t.length; i++)
                this.spot(t[i], i, 0, Ra)
        }
        else return this.#t
    }
}

// :: Main

if (module === require.main) R.go(true, async() => {
    const B = new ZBoard(60, 20, RC.snow)
    B.border({})

    R.atemp(null, () => { R
        .apos(B.pos.bottomLeft())
        .abgc(RC.sky)
        .say("<C-c> exit")
        .apos(B.pos.bottomRight(-2))
        .say("qwq")
    })
    
    const barTitle = new ZBar(1, true, "trunc")
    B.zone.mnt(barTitle, B.pos.topLeft())

    barTitle.bgcDft(RC.cyan)
    barTitle.text("Terminal Dashboard -- ForkKILLET", { fgc: RC.white })
    R.apos(B.pos.bottomLeft(0, 1, false))

    await R.sleep(2000)

    setInterval(() =>
        barTitle.text("[Time] " + Date.fromTimeZone(+8).fommat("yyyy.mm.dd; HH:MM:SS", true), { fgc: RC.white }),
    700)
})

// :: Export

module.exports = {
    CP,
    R, RC, RS,
    Zone, ZBoard, ZBar
}

