"""Build the local block font from the checked-in 5x7 glyph grids.
Development only: python -m pip install fonttools==4.60.1
"""
import json
from pathlib import Path
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
root=Path(__file__).resolve().parents[1]
source=json.loads((root/'assets/pixel-font.json').read_text())
fb=FontBuilder(800,isTTF=True)
glyphs={};metrics={};cmap={}
for index,(char,rows) in enumerate({'\0':source['?'],**source}.items()):
    name='.notdef' if char=='\0' else f'uni{ord(char):04X}'
    pen=TTGlyphPen(None)
    for y,row in enumerate(rows):
        for x,pixel in enumerate(row):
            if pixel=='1':
                left=x*100;bottom=(6-y)*100
                pen.moveTo((left,bottom));pen.lineTo((left+100,bottom));pen.lineTo((left+100,bottom+100));pen.lineTo((left,bottom+100));pen.closePath()
    glyphs[name]=pen.glyph();metrics[name]=((len(rows[0])+1)*100,0)
    if char!='\0':cmap[ord(char)]=name
    if 'A'<=char<='Z':cmap[ord(char.lower())]=name
fb.setupGlyphOrder(list(glyphs));fb.setupCharacterMap(cmap);fb.setupGlyf(glyphs)
fb.setupHorizontalMetrics(metrics);fb.setupHorizontalHeader(ascent=800,descent=0)
fb.setupNameTable({'familyName':'CyberSteer Pixel','styleName':'Regular','uniqueFontIdentifier':'CyberSteer-Pixel-1','fullName':'CyberSteer Pixel','psName':'CyberSteerPixel-Regular','version':'Version 1.0'})
fb.setupOS2(sTypoAscender=800,sTypoDescender=0,usWinAscent=800,usWinDescent=0)
fb.setupPost();fb.setupMaxp();fb.save(root/'assets/cybersteer-pixel.ttf')
print('Built assets/cybersteer-pixel.ttf from original glyph grids.')
