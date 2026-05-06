import React from 'react';

/**
 * Le Maire — mascotte officielle de Debt City.
 *
 * Usage :
 *   <Mayor size={240} mood="welcome" />
 *
 * Props :
 *   - size  : largeur en px (ratio fixe 240×320). Défaut 240.
 *   - mood  : 'welcome' | 'point' | 'concern' | 'cheer' | 'neutral'
 *   - flip  : retourner horizontalement (regarde à gauche). Défaut false.
 */

export type MayorMood = 'welcome' | 'point' | 'concern' | 'cheer' | 'neutral';

export interface MayorProps {
  size?: number;
  mood?: MayorMood;
  flip?: boolean;
}

type FaceState = {
  eyeY: number;
  browY: number;
  browTilt: number;
  mouth: 'smile' | 'grin' | 'flat' | 'open';
};

const FACE_BY_MOOD: Record<MayorMood, FaceState> = {
  welcome:  { eyeY: 128, browY: 118, browTilt: 0,  mouth: 'smile' },
  point:    { eyeY: 128, browY: 118, browTilt: 0,  mouth: 'open'  },
  concern:  { eyeY: 130, browY: 120, browTilt: 12, mouth: 'flat'  },
  cheer:    { eyeY: 128, browY: 118, browTilt: 0,  mouth: 'grin'  },
  neutral:  { eyeY: 128, browY: 118, browTilt: 0,  mouth: 'smile' },
};

export const Mayor: React.FC<MayorProps> = ({ size = 240, mood = 'welcome', flip = false }) => {
  const w = size;
  const h = size * (320 / 240);
  const eyes = FACE_BY_MOOD[mood];

  return (
    <svg
      viewBox="0 0 240 320"
      width={w}
      height={h}
      xmlns="http://www.w3.org/2000/svg"
      style={{ transform: flip ? 'scaleX(-1)' : 'none', overflow: 'visible' }}
    >
      {/* Shadow */}
      <ellipse cx="120" cy="305" rx="72" ry="8" fill="rgba(0,0,0,0.45)" />

      {/* Body / suit */}
      <path
        d="M58 200 Q60 180 80 175 L160 175 Q180 180 182 200 L188 295 Q189 305 178 305 L62 305 Q51 305 52 295 Z"
        fill="#1A1530"
      />
      <path d="M100 175 L120 215 L140 175 Z" fill="#0E0B1A" />
      <path d="M108 175 L120 200 L132 175 Z" fill="#F5EFE5" />

      {/* Sash — brand colors */}
      <path d="M70 178 L100 178 L92 220 L80 220 L64 200 Z" fill="#FFC03A" />
      <path d="M100 178 L140 178 L132 220 L92 220 Z" fill="#4DA8FF" />
      <path d="M140 178 L172 178 L176 200 L160 220 L132 220 Z" fill="#FF4D8D" />

      {/* Sash badge */}
      <circle cx="120" cy="208" r="9" fill="#0E0B1A" />
      <circle cx="120" cy="208" r="9" fill="none" stroke="#F5EFE5" strokeWidth="1.5" />
      <text x="120" y="212" textAnchor="middle"
        fontFamily="Bricolage Grotesque, sans-serif" fontWeight={800} fontSize={11} fill="#FFC03A">
        DC
      </text>

      {/* Tie */}
      <path d="M114 218 L126 218 L128 240 L120 270 L112 240 Z" fill="#FF4D8D" />

      {/* Arms — varient selon le mood */}
      {mood === 'welcome' && (
        <>
          <path d="M58 200 Q40 180 32 130 Q30 118 42 116 Q54 114 56 126 L72 200 Z" fill="#1A1530" />
          <circle cx="38" cy="118" r="10" fill="#E8B89A" />
          <path d="M22 100 Q16 96 14 102" stroke="#FFC03A" strokeWidth={3} fill="none" strokeLinecap="round" />
          <path d="M24 88 Q20 82 18 88" stroke="#FFC03A" strokeWidth={3} fill="none" strokeLinecap="round" />
          <path d="M182 200 Q198 220 190 260 Q188 275 175 275 Q168 275 170 260 L168 215 Z" fill="#1A1530" />
          <rect x="158" y="245" width="32" height="42" rx="3" fill="#FFC03A" />
          <rect x="162" y="252" width="24" height="2" fill="#0E0B1A" />
          <rect x="162" y="258" width="20" height="2" fill="#0E0B1A" />
          <rect x="162" y="264" width="16" height="2" fill="#0E0B1A" />
        </>
      )}

      {mood === 'point' && (
        <>
          <path d="M58 200 Q42 220 50 260 Q52 275 65 275 Q72 275 70 260 L72 215 Z" fill="#1A1530" />
          <circle cx="62" cy="270" r="10" fill="#E8B89A" />
          <path d="M182 200 Q210 175 220 110 Q222 98 210 96 Q198 94 196 106 L172 200 Z" fill="#1A1530" />
          <circle cx="216" cy="100" r="11" fill="#E8B89A" />
          <rect x="213" y="78" width="6" height="20" rx="3" fill="#E8B89A" />
        </>
      )}

      {mood === 'concern' && (
        <>
          <path d="M182 200 Q200 175 178 145 Q170 138 162 146 Q156 154 162 162 L172 200 Z" fill="#1A1530" />
          <circle cx="166" cy="158" r="11" fill="#E8B89A" />
          <path d="M58 200 Q42 220 50 260 Q52 275 65 275 Q72 275 70 260 L72 215 Z" fill="#1A1530" />
          <circle cx="62" cy="270" r="10" fill="#E8B89A" />
        </>
      )}

      {mood === 'cheer' && (
        <>
          <path d="M58 200 Q38 175 30 110 Q28 98 40 96 Q52 94 54 106 L72 200 Z" fill="#1A1530" />
          <circle cx="36" cy="100" r="11" fill="#E8B89A" />
          <path d="M182 200 Q202 175 210 110 Q212 98 200 96 Q188 94 186 106 L168 200 Z" fill="#1A1530" />
          <circle cx="204" cy="100" r="11" fill="#E8B89A" />
          <text x="20" y="80" fontFamily="Bricolage Grotesque, sans-serif" fontWeight={800} fontSize={18} fill="#FFC03A">+</text>
          <text x="220" y="76" fontFamily="Bricolage Grotesque, sans-serif" fontWeight={800} fontSize={14} fill="#FFC03A">+</text>
        </>
      )}

      {mood === 'neutral' && (
        <>
          <path d="M58 200 Q42 220 50 260 Q52 275 65 275 Q72 275 70 260 L72 215 Z" fill="#1A1530" />
          <circle cx="62" cy="270" r="10" fill="#E8B89A" />
          <path d="M182 200 Q198 220 190 260 Q188 275 175 275 Q168 275 170 260 L168 215 Z" fill="#1A1530" />
          <circle cx="178" cy="270" r="10" fill="#E8B89A" />
        </>
      )}

      {/* Neck */}
      <rect x="110" y="158" width="20" height="20" fill="#E8B89A" />

      {/* Head */}
      <ellipse cx="120" cy="130" rx="42" ry="46" fill="#E8B89A" />
      <ellipse cx="78" cy="132" rx="6" ry="9" fill="#E8B89A" />
      <ellipse cx="162" cy="132" rx="6" ry="9" fill="#E8B89A" />

      {/* Eyebrows */}
      <rect
        x="96" y={eyes.browY} width="14" height="3" rx="1.5"
        fill="#0E0B1A"
        transform={eyes.browTilt ? `rotate(${eyes.browTilt} 103 ${eyes.browY + 1})` : undefined}
      />
      <rect
        x="130" y={eyes.browY} width="14" height="3" rx="1.5"
        fill="#0E0B1A"
        transform={eyes.browTilt ? `rotate(${-eyes.browTilt} 137 ${eyes.browY + 1})` : undefined}
      />

      {/* Eyes */}
      {mood === 'cheer' ? (
        <>
          <path d="M96 128 Q103 122 110 128" stroke="#0E0B1A" strokeWidth={2.5} fill="none" strokeLinecap="round" />
          <path d="M130 128 Q137 122 144 128" stroke="#0E0B1A" strokeWidth={2.5} fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="103" cy={eyes.eyeY} r="3" fill="#0E0B1A" />
          <circle cx="137" cy={eyes.eyeY} r="3" fill="#0E0B1A" />
        </>
      )}

      {/* Cheeks */}
      <circle cx="92" cy="142" r="5" fill="#FF4D8D" opacity={0.4} />
      <circle cx="148" cy="142" r="5" fill="#FF4D8D" opacity={0.4} />

      {/* Moustache */}
      <path
        d="M104 148 Q98 154 92 152 Q97 158 110 156 L120 153 L130 156 Q143 158 148 152 Q142 154 136 148 Q128 156 120 156 Q112 156 104 148 Z"
        fill="#0E0B1A"
      />

      {/* Mouth */}
      {eyes.mouth === 'smile' && (
        <path d="M112 162 Q120 168 128 162" stroke="#0E0B1A" strokeWidth={2} fill="none" strokeLinecap="round" />
      )}
      {eyes.mouth === 'grin' && (
        <path d="M108 160 Q120 172 132 160" stroke="#0E0B1A" strokeWidth={2.5} fill="none" strokeLinecap="round" />
      )}
      {eyes.mouth === 'flat' && (
        <path d="M112 164 L128 164" stroke="#0E0B1A" strokeWidth={2} fill="none" strokeLinecap="round" />
      )}
      {eyes.mouth === 'open' && (
        <ellipse cx="120" cy="164" rx="4" ry="3" fill="#0E0B1A" />
      )}

      {/* TOP HAT */}
      <ellipse cx="120" cy="92" rx="58" ry="8" fill="#0E0B1A" />
      <ellipse cx="120" cy="91" rx="58" ry="8" fill="#1A1530" />
      <rect x="84" y="44" width="72" height="50" rx="2" fill="#0E0B1A" />
      <rect x="84" y="84" width="24" height="8" fill="#4DA8FF" />
      <rect x="108" y="84" width="24" height="8" fill="#FFC03A" />
      <rect x="132" y="84" width="24" height="8" fill="#FF4D8D" />
      <rect x="92" y="50" width="3" height="32" rx="1.5" fill="rgba(255,255,255,0.12)" />
    </svg>
  );
};

export default Mayor;
