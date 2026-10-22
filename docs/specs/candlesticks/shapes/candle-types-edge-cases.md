# Neutral shapes precedence

    Neutral Doji: C = O
    Neutral flat: H = L

>Note:  This is actually a very important edge case for a robust specification.
>The answer depends on whether your framework classifies candles using only:
>(H, L)
>or using the full:
>(O, H, L, C)


Currently our 12-pattern model is a range relationship model, so only High and Low matter.

Case 1: Neutral Doji

A Doji is typically:

O = C


while

H > L


still holds.

Example:

Previous
H=100
L=90

Current
O=95
H=105
L=92
C=95


The current candle is a Doji.

Relationship:

Current High > Previous High
HH

Current Low > Previous Low
HL


Result:

HH-HL


The fact that the candle is a Doji does not affect the relationship classification.

Therefore:

Doji is orthogonal to HH/LH/EH/HL/LL/EL


and can coexist with any of the 12 valid patterns.

Examples:

Doji HH-HL
Doji LH-LL
Doji EH-EL
Doji HH-LL


are all possible.

Case 2: Flat Candle

You defined:

H = L


This is a much rarer case.

Essentially:

O = H = L = C


Single-price candle.

Visually:

-


instead of a normal candle.

Example:

Previous
H=100
L=90

Current
H=95
L=95

How Should It Be Classified?

The simplest rule is:

High comparison remains valid.
Low comparison remains valid.


So:

prev H=100
prev L=90

curr H=95
curr L=95


gives:

LH
HL


Result:

LH-HL


which is an Inside Bar.

Potential Problem

Consider:

prev H=100
prev L=100

curr H=100
curr L=100


Now:

EH
EL


Result:

EH-EL


Double Bar.

Still valid.

Degenerate Market States

A flat candle introduces a special concept:

Range = H - L = 0


These are sometimes called:

Zero Range Bars


or

Flat Bars


From a market-structure perspective they are usually treated as a subtype of whatever HH/LH/EH- HL/LL/EL relationship they generate.

Recommended Specification

Add a second independent classification layer.

Layer 1: Range Relationship

Produces:

HH-HL
HH-LL
HH-EL

LH-LL
LH-HL
LH-EL

EH-HL
EH-LL
EH-EL

EL-LH
EL-HH
EL-EH

Layer 2: Candle Shape

Produces:

NORMAL
DOJI
FLAT


Pseudo:

IF H == L
    shape = FLAT

ELSE IF O == C
    shape = DOJI

ELSE
    shape = NORMAL

Final Classification Object

Example 1

Previous
H=100
L=90

Current
O=95
H=110
L=95
C=95


Returns:

relationship = HH-HL

pattern = Up Trend Bar

shape = DOJI


Example 2

Previous
H=100
L=90

Current
O=95
H=95
L=95
C=95


Returns:

relationship = LH-HL

pattern = Inside Bar

shape = FLAT

Best Practice for Trading Systems

I would model them independently:

Pattern = HH-HL
Shape   = DOJI

Pattern = HH-LL
Shape   = MARUBOZU

Pattern = EH-EL
Shape   = FLAT


This avoids exploding the state space.

Otherwise you'd end up with:

12 relationship patterns
×
N candle shapes


For just the common shapes (Bull Marubozu, Bull Trend, Bull Spinning Top, Doji, Bear Trend, Bear Marubozu, Flat, etc.) you quickly get 50-100+ combinations.

A cleaner architecture is:

Market Structure  = HH-HL
Candle Shape      = DOJI
Volatility State  = CONTRACTION


where each dimension is evaluated separately and then combined by strategy rules.