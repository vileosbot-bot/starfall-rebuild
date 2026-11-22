/** Original procedural vector portraits. No external image assets. */
let portraitSerial = 0;
const CAST = {
  tank: { name:'樊哙', color:'#dba94e', dark:'#25313d', light:'#f4df9a', skin:'#cb9774' },
  fighter: { name:'程咬金', color:'#e67342', dark:'#492529', light:'#ffc989', skin:'#d39973' },
  mage: { name:'王昭君', color:'#8bdaf4', dark:'#252e62', light:'#e4fcff', skin:'#f3d9ca' },
  marksman: { name:'李广', color:'#91c992', dark:'#223b39', light:'#e1deb0', skin:'#dba785' },
  assassin: { name:'荆轲', color:'#bb95f3', dark:'#33294c', light:'#e6d3ff', skin:'#dcbdab' },
};
function safe(s) { return String(s).replace(/[^a-zA-Z0-9_-]/g,''); }
function stars(seed) {
  let s=seed; let out='';
  for(let i=0;i<27;i++) { s=(s*1664525+1013904223)>>>0; const x=12+(s%296); s=(s*1664525+1013904223)>>>0; const y=16+(s%374); const r=i%7===0?1.6:0.65; out+=`<circle cx="${x}" cy="${y}" r="${r}" fill="#e5d5a2" opacity="${i%3===0?'.5':'.22'}"/>`; }
  return out;
}
function bodyTank(g) { return `
  <path d="M64 275L53 420H280L267 272L213 219H113Z" fill="url(#${g}-cloth)"/>
  <path d="M92 252L58 288L32 365L59 392L105 342L130 276Z" fill="#605e50"/>
  <path d="M210 250L255 260L285 321L278 364L242 347L214 299Z" fill="#7d765e"/>
  <path d="M78 244L118 221L164 239L126 291L68 286L48 272Z" fill="url(#${g}-metal)" stroke="#b58e4a" stroke-width="3"/>
  <path d="M209 220L263 244L280 273L218 292L184 239Z" fill="url(#${g}-metal)" stroke="#b58e4a" stroke-width="3"/>
  <path d="M78 247L115 233L104 262L63 271Z" fill="#b7ab7b"/>
  <path d="M214 231L255 250L262 270L222 266Z" fill="#b9a972"/>
  <path d="M126 228L157 218L198 229L220 301L193 354L122 343L103 295Z" fill="url(#${g}-armor)" stroke="#c59b50" stroke-width="2.5"/>
  <path d="M156 239L180 239L197 284L173 304L143 279Z" fill="#ccab61"/>
  <path d="M163 250L179 250L184 275L171 288L153 276Z" fill="#efdc9d"/>
  <path d="M119 308L205 311L199 335L128 334Z" fill="#45535d"/>
  <path d="M123 342L205 342L216 357L116 358Z" fill="#c4a05c"/>
  <path d="M129 364L163 360L157 418H117Z" fill="#796448"/>
  <path d="M170 360L205 365L224 418H174Z" fill="#9e8052"/>
  <path d="M145 187L148 229L169 247L188 229L188 185Z" fill="#a77c5c"/>
  <path d="M126 109L151 89L186 93L208 119L205 163L190 196L167 213L141 197L123 157Z" fill="url(#${g}-skin)"/>
  <path d="M165 99L190 103L200 128L198 163L184 184L167 189Z" fill="#ae7c60"/>
  <path d="M127 125L115 114L124 88L146 74L181 78L207 97L215 122L201 130L189 108L170 112L146 105Z" fill="#2b2a2b"/>
  <path d="M139 86L151 59L174 52L195 64L190 83L167 92Z" fill="#333137"/>
  <path d="M149 76L188 76L189 85L145 85Z" fill="#c8a04f"/>
  <path d="M122 145L133 151L137 168L150 180L169 178L186 170L199 147L206 151L201 190L184 221L162 236L142 215L125 189Z" fill="#373032"/>
  <path d="M130 169L145 184L162 189L163 224L143 208Z" fill="#514039"/>
  <path d="M162 189L186 180L195 169L186 207L166 229Z" fill="#25262a"/>
  <path d="M135 140L151 135L157 141L136 145Z" fill="#2b292c"/>
  <path d="M173 139L190 135L198 143L174 144Z" fill="#282629"/>
  <path d="M139 146L150 145M179 146L189 146" stroke="#e7cb98" stroke-width="2.4"/>
  <path d="M164 143L156 166L171 167" fill="none" stroke="#885f49" stroke-width="3"/>
  <path d="M147 177L160 170L173 170L186 176L174 183L159 179Z" fill="#201f24"/>
  <path d="M255 180L266 66L273 49L282 69L271 182Z" fill="#d5e5dc" stroke="#e7d49e" stroke-width="2"/>
  <path d="M269 72L274 60L273 172L266 181Z" fill="#779799"/>
  <path d="M243 183L282 184L283 195L243 194Z" fill="#ceaa59"/>
  <path d="M256 196L270 196L270 242L258 243Z" fill="#4c3830"/>
  <path d="M253 219L271 216L283 228L278 247L257 251L249 236Z" fill="#bc8b69"/>
  <path d="M92 266L143 288L148 347L117 387L66 389L29 354L27 296Z" fill="#514a38" stroke="#d5b66d" stroke-width="6"/>
  <path d="M91 280L130 296L134 341L108 373L73 374L42 348L41 305Z" fill="url(#${g}-shield)" stroke="#aa8d51" stroke-width="2"/>
  <path d="M88 293L103 318L125 330L103 342L88 365L76 341L51 330L75 318Z" fill="#d3b778"/>
  <path d="M88 306L98 324L111 331L97 338L88 353L80 336L65 330L80 324Z" fill="#f4d994"/>
  <circle cx="89" cy="331" r="8" fill="#71604a"/>
  <path d="M32 296L65 288M142 316L139 345M66 386L99 386" stroke="#f6df9d" stroke-width="3"/>
  `; }
function bodyFighter(g) { return `
  <path d="M98 227L55 282L69 420H272L272 286L226 225Z" fill="url(#${g}-cloth)"/>
  <path d="M110 226L78 254L52 321L73 350L113 302L141 252Z" fill="#be8665"/>
  <path d="M212 225L251 245L278 291L277 331L253 345L232 294L194 253Z" fill="#ce9671"/>
  <path d="M100 224L133 221L142 258L114 284L68 273L64 256Z" fill="url(#${g}-armor)" stroke="#cd9d52" stroke-width="3"/>
  <path d="M208 222L239 226L267 254L259 276L214 278L185 255Z" fill="url(#${g}-armor)" stroke="#cd9d52" stroke-width="3"/>
  <path d="M81 255L111 238L118 255L105 271Z" fill="#d96d48"/>
  <path d="M227 238L251 253L251 269L226 265Z" fill="#e37a4c"/>
  <path d="M130 240L176 227L209 243L228 320L208 361L123 360L100 310Z" fill="#793335" stroke="#bf8c4c" stroke-width="3"/>
  <path d="M137 251L167 244L202 251L209 294L182 305L164 292L138 303L122 285Z" fill="url(#${g}-metal)"/>
  <path d="M139 309L163 299L184 313L210 303L217 323L191 338L165 328L130 339L123 321Z" fill="#b85939"/>
  <path d="M125 346L211 344L221 366L114 369Z" fill="#3c2e30" stroke="#cca459" stroke-width="3"/>
  <path d="M156 343L184 344L194 358L177 375L153 361Z" fill="#d4ad60"/>
  <path d="M165 350L179 349L183 358L175 367L162 361Z" fill="#f7d798"/>
  <path d="M125 373L162 369L155 419H102Z" fill="#852e32"/>
  <path d="M176 372L212 375L239 420H180Z" fill="#9d3837"/>
  <path d="M144 190L145 230L167 247L195 232L191 187Z" fill="#b47b57"/>
  <path d="M126 107L151 87L184 89L208 110L215 145L202 180L182 204L152 200L132 180L118 141Z" fill="url(#${g}-skin)"/>
  <path d="M171 97L194 109L206 137L200 164L184 181L176 169L176 138Z" fill="#bc805e"/>
  <path d="M122 126L111 113L126 89L151 78L184 78L210 92L219 122L207 129L194 105L165 106L141 104Z" fill="#2e2929"/>
  <path d="M146 82L143 60L151 47L172 43L188 54L186 83Z" fill="#3a3030"/>
  <path d="M141 71L190 72L191 83L145 84Z" fill="#b85c3e"/>
  <path d="M127 130L150 126L156 133L130 138Z" fill="#332a26"/>
  <path d="M178 131L199 125L205 133L179 139Z" fill="#332a26"/>
  <path d="M132 141L150 140M182 141L199 139" stroke="#251f22" stroke-width="3"/>
  <path d="M164 135L155 159L171 161" fill="none" stroke="#9d644d" stroke-width="3"/>
  <path d="M130 173L145 166L163 170L181 165L202 171L190 183L170 178L161 184L145 177Z" fill="#30282a"/>
  <path d="M144 184L161 193L180 189L191 180L189 202L170 221L147 209Z" fill="#43312c"/>
  <path d="M154 196L168 201L177 197L172 217Z" fill="#6c4a36"/>
  <path d="M59 304L80 306L93 327L77 350L56 342L48 322Z" fill="#3a3d40" stroke="#be965c" stroke-width="3"/>
  <path d="M251 298L276 299L287 325L273 346L252 339L244 319Z" fill="#3a3d40" stroke="#be965c" stroke-width="3"/>
  <path d="M36 250L48 244L281 67L290 79L54 258Z" fill="#67513b" stroke="#d5b273" stroke-width="2"/>
  <path d="M223 57L242 37L274 40L302 70L290 114L257 135L246 117L269 98L270 79L249 71L236 91L212 89Z" fill="url(#${g}-metal)" stroke="#d2b37b" stroke-width="3"/>
  <path d="M240 44L264 46L291 71L284 101L264 115L268 95L280 81L263 58Z" fill="#d8dfd9"/>
  <path d="M225 55L213 83L234 85L244 65Z" fill="#774e38"/>
  <path d="M88 213L108 201L124 209L122 225L102 242L90 230Z" fill="#d5a07a"/>
  `; }
function bodyMage(g) { return `
  <path d="M124 110L113 186L89 280L74 420H275L253 293L224 190L217 111Z" fill="#182740"/>
  <path d="M123 206L84 239L46 333L82 381L130 317L146 238Z" fill="url(#${g}-cloth)"/>
  <path d="M201 206L239 233L279 329L251 379L208 323L179 238Z" fill="url(#${g}-cloth)"/>
  <path d="M113 224L84 248L58 329L81 348L121 278L146 247Z" fill="#badfe9"/>
  <path d="M220 225L242 251L263 325L250 344L218 275L189 248Z" fill="#6bafd0"/>
  <path d="M141 205L165 214L190 205L216 270L231 420H99L115 273Z" fill="url(#${g}-armor)"/>
  <path d="M145 221L166 237L185 219L198 258L169 290L135 259Z" fill="#d0ebed"/>
  <path d="M142 246L169 269L189 246L195 260L170 295L131 267Z" fill="#458bba"/>
  <path d="M150 291L172 296L184 287L197 420H129Z" fill="#8bc7df"/>
  <path d="M131 291L153 310L129 420H100Z" fill="#658cbd"/>
  <path d="M185 307L198 289L230 420H202Z" fill="#457cac"/>
  <path d="M118 292L153 307L193 305L211 289L215 304L192 320L151 322L114 307Z" fill="#ded5a2"/>
  <path d="M154 304L173 296L192 308L174 325Z" fill="#f5efd3"/>
  <path d="M172 303L181 310L174 317L165 310Z" fill="#93dceb"/>
  <path d="M146 175L147 215L167 234L186 213L185 173Z" fill="#dfb8a7"/>
  <path d="M129 99L153 78L184 80L204 101L207 140L192 177L168 194L146 180L130 150Z" fill="url(#${g}-skin)"/>
  <path d="M166 90L187 92L198 111L197 144L185 170L171 177L169 158Z" fill="#e9c4b6"/>
  <path d="M124 134L114 113L122 83L142 64L169 61L198 71L216 99L213 133L201 145L195 105L183 91L162 115L139 123L134 108Z" fill="#172941"/>
  <path d="M137 77L159 68L179 71L158 102L137 114Z" fill="#2d405c"/>
  <path d="M202 103L207 145L219 203L210 278L229 310L239 234L228 174L218 111Z" fill="#263c5d"/>
  <path d="M127 124L119 168L99 220L105 285L124 312L117 234L139 188L139 153Z" fill="#253c5b"/>
  <path d="M145 139L156 136L161 140L148 143Z" fill="#444154"/>
  <path d="M179 137L190 134L197 139L181 141Z" fill="#444154"/>
  <path d="M149 144L156 144M183 143L190 142" stroke="#194c69" stroke-width="2.7"/>
  <path d="M168 143L164 157L171 158" fill="none" stroke="#c2968a" stroke-width="2"/>
  <path d="M160 170L168 167L177 169L169 174Z" fill="#bd6f80"/>
  <path d="M138 81L147 62L158 76L169 50L181 74L196 62L202 85L171 95Z" fill="#a4dce7" stroke="#e9e6c7" stroke-width="2"/>
  <path d="M169 58L179 77L170 89L159 78Z" fill="#edfaf4"/>
  <path d="M143 84L132 101L131 137" fill="none" stroke="#ded6aa" stroke-width="3"/>
  <path d="M201 86L213 101L216 139" fill="none" stroke="#ded6aa" stroke-width="3"/>
  <path d="M129 135L134 144L129 155L123 144Z" fill="#b8f1ef"/>
  <path d="M216 137L222 146L216 159L210 146Z" fill="#b8f1ef"/>
  <path d="M126 208L108 219L100 234L133 245L145 226Z" fill="#d9e9df" stroke="#d3cb9f" stroke-width="2"/>
  <path d="M202 209L222 222L232 240L202 246L186 224Z" fill="#afd0dd" stroke="#d3cb9f" stroke-width="2"/>
  <path d="M176 243L195 245L193 299C222 325 220 354 192 367C159 373 133 351 149 326L173 298Z" fill="#b8865f" stroke="#f0d5a0" stroke-width="4"/>
  <path d="M181 250L189 249L184 307C214 331 207 349 186 357C163 362 146 348 157 331L180 305Z" fill="#e5b980"/>
  <path d="M180 255L181 342M184 253L186 342M188 252L192 342" stroke="#fff0c5" stroke-width="1.4"/>
  <path d="M168 341L200 339" stroke="#875e4c" stroke-width="5"/>
  <path d="M174 243L175 230L200 231L196 246Z" fill="#986c56" stroke="#e5c78f" stroke-width="2"/>
  <path d="M114 287L130 284L156 316L169 327L161 339L144 334L117 310Z" fill="#efd2c1"/>
  <path d="M223 275L232 286L213 310L196 309L191 297L205 293Z" fill="#e1b8a9"/>
  <path d="M48 331L81 351L100 394L126 411L105 419L77 403Z" fill="#bfdce9" opacity=".8"/>
  <path d="M252 343L276 331L264 383L236 414L212 416L240 388Z" fill="#8bbfdd" opacity=".75"/>
  <path d="M58 196L64 186L71 197L82 203L70 209L65 220L59 210L48 203Z" fill="#c4f8ff" opacity=".75"/>
  <path d="M260 164L266 152L273 165L285 171L272 178L267 192L259 180L246 173Z" fill="#c4f8ff" opacity=".65"/>
  `; }
function bodyMarksman(g) { return `
  <path d="M126 192L98 211L64 276L59 420H255L259 279L219 214L189 194Z" fill="url(#${g}-cloth)"/>
  <path d="M110 207L73 237L57 278L99 297L129 253Z" fill="#57745d" stroke="#a6ae72" stroke-width="2"/>
  <path d="M211 211L241 234L262 277L227 292L197 248Z" fill="#66856b" stroke="#a6ae72" stroke-width="2"/>
  <path d="M118 232L157 217L194 232L219 305L197 354L120 357L96 306Z" fill="url(#${g}-armor)" stroke="#d0be7b" stroke-width="2"/>
  <path d="M120 242L152 234L187 244L198 276L163 291L121 281Z" fill="url(#${g}-metal)"/>
  <path d="M126 287L161 301L201 289L208 314L171 328L124 314Z" fill="#426b61"/>
  <path d="M127 324L169 339L203 326L201 349L126 352Z" fill="#718370"/>
  <path d="M122 352L201 349L218 369L117 375Z" fill="#65543e" stroke="#d0b77b" stroke-width="2.4"/>
  <path d="M159 350L180 350L188 362L176 377L156 368Z" fill="#d6c085"/>
  <path d="M124 378L159 373L148 420H99Z" fill="#3f5a50"/>
  <path d="M176 377L206 378L229 420H178Z" fill="#577563"/>
  <path d="M77 277L98 285L113 319L102 339L83 333L63 300Z" fill="#bb8e6c"/>
  <path d="M228 276L248 278L267 312L253 336L235 326L218 299Z" fill="#c09273"/>
  <path d="M92 313L116 311L132 340L115 359L96 350Z" fill="#3a4543" stroke="#b0a16d" stroke-width="3"/>
  <path d="M241 306L261 308L272 333L255 350L239 337Z" fill="#3d4b44" stroke="#b0a16d" stroke-width="3"/>
  <path d="M143 177L145 217L163 232L188 216L187 176Z" fill="#bc8b6c"/>
  <path d="M124 105L147 83L182 84L203 101L207 139L192 170L175 190L151 185L130 160L121 133Z" fill="url(#${g}-skin)"/>
  <path d="M167 92L190 101L199 120L195 147L182 168L168 172Z" fill="#bd8969"/>
  <path d="M123 130L114 110L124 87L145 75L182 76L207 92L216 117L204 128L196 105L173 98L152 105L135 106Z" fill="#303338"/>
  <path d="M157 77L154 58L172 45L190 51L197 65L188 80Z" fill="#35393b"/>
  <path d="M187 62L211 68L227 93L222 120L204 98L194 94Z" fill="#282f35"/>
  <path d="M149 82L194 83L203 97L129 105Z" fill="#779a75" stroke="#cbb674" stroke-width="2.2"/>
  <path d="M156 86L170 80L183 88L171 99Z" fill="#dad3a6"/>
  <path d="M132 131L150 127L156 131L137 136Z" fill="#343137"/>
  <path d="M176 131L193 124L200 130L178 136Z" fill="#343137"/>
  <path d="M137 139L149 138M181 138L192 136" stroke="#223333" stroke-width="2.5"/>
  <path d="M163 137L156 157L169 158" fill="none" stroke="#92694f" stroke-width="2.8"/>
  <path d="M147 167L162 164L178 167L171 173L157 172Z" fill="#564039"/>
  <path d="M149 178L167 181L180 174L177 192L165 204L153 194Z" fill="#373233"/>
  <path d="M76 233L66 149L82 138L107 229Z" fill="#725b40" stroke="#a39261" stroke-width="3"/>
  <path d="M70 143L62 88M77 140L73 79M84 141L88 91" stroke="#cbb57c" stroke-width="3"/>
  <path d="M62 94L50 81L51 60L62 75L69 59L72 81Z" fill="#b9c7b6"/>
  <path d="M73 86L66 70L70 48L78 65L88 48L84 71Z" fill="#d9d8ae"/>
  <path d="M88 98L82 85L90 66L95 82L105 67L99 90Z" fill="#829d8c"/>
  <path d="M253 91Q299 148 279 218Q255 274 280 348Q287 375 276 400" fill="none" stroke="#d5bb75" stroke-width="9"/>
  <path d="M255 93Q288 153 268 216Q246 275 271 350Q279 376 276 400" fill="none" stroke="#667569" stroke-width="4"/>
  <path d="M253 91L244 245L276 400" fill="none" stroke="#f1e0b6" stroke-width="1.5"/>
  <path d="M239 218L254 215L260 252L247 257Z" fill="#645339" stroke="#d0ad70" stroke-width="3"/>
  <path d="M229 233L245 226L256 238L252 253L237 261L226 252Z" fill="#d3a27c"/>
  <path d="M111 335L125 332L145 343L146 359L132 367L117 357Z" fill="#c99a79"/>
  `; }
function bodyAssassin(g) { return `
  <path d="M111 196L70 230L43 327L52 420H281L277 309L236 230L201 199Z" fill="url(#${g}-cloth)"/>
  <path d="M118 219L83 232L60 283L89 312L127 264Z" fill="#514462" stroke="#8b76a5" stroke-width="2"/>
  <path d="M207 216L242 235L268 283L240 306L204 264Z" fill="#594965" stroke="#9b84b7" stroke-width="2"/>
  <path d="M124 234L165 223L199 237L225 307L200 361L122 360L96 309Z" fill="url(#${g}-armor)"/>
  <path d="M130 247L163 235L196 251L200 279L165 296L125 280Z" fill="#66577b" stroke="#b4a4c3" stroke-width="2"/>
  <path d="M131 283L161 302L199 286L207 311L171 326L124 310Z" fill="#322f46"/>
  <path d="M126 316L167 338L205 318L199 349L159 355L124 344Z" fill="#736183"/>
  <path d="M109 238L118 226L219 346L209 362Z" fill="#645446" stroke="#b19a76" stroke-width="2"/>
  <path d="M184 230L194 240L133 355L119 349Z" fill="#493b3e" stroke="#988369" stroke-width="2"/>
  <path d="M120 352L204 348L219 369L113 374Z" fill="#332d36" stroke="#b6a389" stroke-width="2.5"/>
  <path d="M151 349L175 346L188 361L172 377L151 365Z" fill="#baa4c4"/>
  <path d="M162 354L174 352L179 361L171 369L159 364Z" fill="#645177"/>
  <path d="M119 376L158 373L149 420H93Z" fill="#51405e"/>
  <path d="M177 375L208 377L240 420H175Z" fill="#453449"/>
  <path d="M80 283L100 289L116 325L102 350L80 340L60 307Z" fill="#4e4358"/>
  <path d="M235 282L256 282L277 314L262 343L239 336L222 307Z" fill="#62506a"/>
  <path d="M78 306L104 306L120 333L105 352L84 339Z" fill="#83728d" stroke="#c4b1c7" stroke-width="2"/>
  <path d="M238 305L263 303L278 331L261 350L242 339Z" fill="#8c7794" stroke="#c4b1c7" stroke-width="2"/>
  <path d="M137 172L139 211L164 237L192 211L192 170Z" fill="#473747"/>
  <path d="M119 109L142 84L178 81L203 101L209 136L194 175L171 195L144 178L123 147Z" fill="url(#${g}-skin)"/>
  <path d="M165 92L189 102L202 124L197 152L177 171L165 169Z" fill="#b79a91"/>
  <path d="M105 136L105 103L123 75L163 51L197 67L220 103L223 143L207 183L202 216L176 198L194 165L205 120L179 99L157 105L136 122L131 163L146 194L122 222L117 177Z" fill="url(#${g}-hood)" stroke="#9480aa" stroke-width="2.2"/>
  <path d="M113 107L137 77L163 61L148 106L129 133L125 172L115 155Z" fill="#685580"/>
  <path d="M163 61L195 77L212 107L205 122L179 99L148 106Z" fill="#7e6598"/>
  <path d="M136 136L152 131L160 137L139 142Z" fill="#403240"/>
  <path d="M178 134L195 127L200 133L180 140Z" fill="#403240"/>
  <path d="M141 144L154 142M181 142L194 137" stroke="#ceebd4" stroke-width="2.3"/>
  <path d="M132 150L153 154L168 150L190 149L202 140L196 175L174 197L146 182Z" fill="#423747"/>
  <path d="M135 158L163 165L193 155L186 169L167 175L142 168Z" fill="#625069"/>
  <path d="M146 177L168 181L187 171L174 191L155 186Z" fill="#2b2a38"/>
  <path d="M122 197L143 202L163 227L188 204L207 201L223 220L191 237L165 250L131 231L104 220Z" fill="#766080" stroke="#ab8fb2" stroke-width="2"/>
  <path d="M75 320L82 309L98 328L97 345L83 353L70 340Z" fill="#bc9d90"/>
  <path d="M254 329L265 315L277 325L283 341L271 354L255 349Z" fill="#c5a597"/>
  <path d="M74 326L42 243L42 216L62 236L85 320Z" fill="url(#${g}-metal)" stroke="#c1c1ce" stroke-width="1.8"/>
  <path d="M43 229L75 316L69 318L49 268Z" fill="#e0e8e6"/>
  <path d="M61 324L89 313L95 324L66 336Z" fill="#b9986c"/>
  <path d="M274 330L290 245L302 226L305 253L284 334Z" fill="url(#${g}-metal)" stroke="#c1c1ce" stroke-width="1.8"/>
  <path d="M301 240L279 326L284 325L299 269Z" fill="#e1e6e9"/>
  <path d="M263 323L289 331L287 342L260 334Z" fill="#b9986c"/>
  <path d="M71 266L53 296L42 366L65 407L89 420L65 359L89 305Z" fill="#342839" opacity=".8"/>
  `; }
const BODIES={tank:bodyTank,fighter:bodyFighter,mage:bodyMage,marksman:bodyMarksman,assassin:bodyAssassin};
/** Hero illustration as an inline SVG. Every invocation namespaces its gradients. */
export function portraitSVG(heroId, {idPrefix='',full=false}={}) {
  const id=CAST[heroId]?heroId:'mage', h=CAST[id];
  const g=`sf-${safe(idPrefix)||'portrait'}-${id}-${++portraitSerial}`;
  const idx=Object.keys(CAST).indexOf(id);
  const bg=full?`<rect width="320" height="420" fill="url(#${g}-bg)"/><path d="M34 420V125L160 25L286 125V420" fill="none" stroke="${h.color}" stroke-opacity=".2" stroke-width="1"/><circle cx="160" cy="165" r="113" fill="none" stroke="${h.color}" stroke-opacity=".18"/><circle cx="160" cy="165" r="104" fill="none" stroke="#d7bd82" stroke-opacity=".15" stroke-dasharray="2 11"/>${stars(1122+idx*707)}`:`<rect width="320" height="420" fill="url(#${g}-bg)"/><ellipse cx="163" cy="202" rx="138" ry="154" fill="url(#${g}-halo)"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 420" role="img" aria-label="${h.name}" preserveAspectRatio="xMidYMid slice"><defs>
    <radialGradient id="${g}-bg" cx="50%" cy="34%" r="75%"><stop stop-color="${h.dark}"/><stop offset="1" stop-color="#0a1020"/></radialGradient>
    <radialGradient id="${g}-halo"><stop stop-color="${h.color}" stop-opacity=".2"/><stop offset="1" stop-color="${h.color}" stop-opacity="0"/></radialGradient>
    <linearGradient id="${g}-cloth" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${h.color}" stop-opacity=".65"/><stop offset=".47" stop-color="${h.dark}"/><stop offset="1" stop-color="#141827"/></linearGradient>
    <linearGradient id="${g}-armor" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${h.color}"/><stop offset=".5" stop-color="${h.dark}"/><stop offset="1" stop-color="#26313d"/></linearGradient>
    <linearGradient id="${g}-metal" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${h.light}"/><stop offset=".4" stop-color="#9a9e91"/><stop offset=".48" stop-color="#d5c79c"/><stop offset=".6" stop-color="#65747b"/><stop offset="1" stop-color="#3a4852"/></linearGradient>
    <linearGradient id="${g}-skin" x1="0" y1="0" x2="1" y2=".7"><stop stop-color="${h.skin}"/><stop offset=".55" stop-color="${h.skin}"/><stop offset="1" stop-color="#a17467"/></linearGradient>
    <linearGradient id="${g}-shield" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#71818a"/><stop offset=".48" stop-color="#364853"/><stop offset="1" stop-color="#1d2c39"/></linearGradient>
    <linearGradient id="${g}-hood" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#8c72a5"/><stop offset=".45" stop-color="#4c405d"/><stop offset="1" stop-color="#292638"/></linearGradient>
    <linearGradient id="${g}-fade" x1="0" y1="0" x2="0" y2="1"><stop offset=".65" stop-color="#080e1b" stop-opacity="0"/><stop offset="1" stop-color="#080e1b" stop-opacity=".85"/></linearGradient>
  </defs>${bg}<ellipse cx="164" cy="413" rx="119" ry="18" fill="#030711" opacity=".5"/>${BODIES[id](g)}<rect width="320" height="420" fill="url(#${g}-fade)"/></svg>`;
}
const urls=new Map();
export function portraitURL(heroId) {
  if(!urls.has(heroId)) urls.set(heroId,`data:image/svg+xml;charset=utf-8,${encodeURIComponent(portraitSVG(heroId,{full:true,idPrefix:'url'}))}`);
  return urls.get(heroId);
}
const ICONS={
 sword:'<path d="M8 24L21 5L27 3L27 9L14 28M7 19L18 30M5 29L9 25"/>',
 axe:'<path d="M8 29L24 6M17 7L22 3L29 7L27 16L22 18L20 13L16 13L13 9Z"/>',
 shield:'<path d="M16 3L28 8L26 20L16 29L6 20L4 8Z"/><path d="M16 8V23M10 14H22"/>',
 magic:'<path d="M16 2L19 12L29 16L19 20L16 30L12 20L2 16L12 12Z"/><path d="M25 3V9M22 6H28"/>',
 bow:'<path d="M10 3Q30 16 10 29L14 16Z"/><path d="M4 16H28M23 12L29 16L23 20"/>',
 dagger:'<path d="M8 26L24 4L29 2L27 9L13 29M6 21L16 30M4 29L8 25"/>',
 boots:'<path d="M11 3H23L21 20L28 24V29H6V23L10 19Z"/><path d="M12 8H21M12 12H20M12 16H20"/>',
 armor:'<path d="M10 3L16 7L22 3L29 9L24 15L23 28H9L8 15L3 9Z"/><path d="M16 10V24M10 17H22"/>',
 cloak:'<path d="M11 3H21L29 28L16 23L3 28Z"/><path d="M11 3L16 12L21 3M16 12V23"/>',
 heart:'<path d="M16 28L4 16Q-1 5 8 4Q14 3 16 9Q19 3 25 4Q34 7 27 17Z"/>',
 ring:'<circle cx="16" cy="20" r="9"/><path d="M10 7L16 2L22 7L16 13Z"/>',
 wand:'<path d="M5 29L21 12M23 2L25 7L30 9L25 11L23 16L20 11L15 9L20 7Z"/>',
 spear:'<path d="M5 29L24 7M21 11L22 3L30 1L28 9Z"/>',
 book:'<path d="M3 5L14 8V28L3 24ZM29 5L18 8V28L29 24Z"/><path d="M14 8H18M14 28H18"/>',
 flash:'<path d="M18 2L5 18H14L11 30L28 12H18Z"/>',
 heal:'<path d="M12 3H20V12H29V20H20V29H12V20H3V12H12Z"/>',
 recall:'<path d="M8 9A11 11 0 1 1 5 21M3 3V12H12"/><path d="M12 15L16 11L20 15V23H12Z"/>',
 attack:'<path d="M5 27L25 7M21 4L28 4L28 11M3 20L12 29M6 30L2 26"/>',
 snow:'<path d="M16 2V30M4 9L28 23M4 23L28 9M11 5L16 10L21 5M11 27L16 22L21 27M5 14L11 13L10 7M22 25L21 19L27 18M5 18L11 19L10 25M22 7L21 13L27 14"/>',
 wave:'<path d="M3 11Q9 2 16 11T29 11M3 19Q9 10 16 19T29 19M3 27Q9 18 16 27T29 27"/>',
 flame:'<path d="M17 2Q26 12 22 16Q27 12 29 20Q31 29 17 30Q4 29 4 20Q4 13 10 10Q7 20 14 19Q20 16 17 2Z"/>',
 crosshair:'<circle cx="16" cy="16" r="9"/><path d="M16 1V8M16 24V31M1 16H8M24 16H31M13 16H19M16 13V19"/>',
 settings:'<path d="M12 3H20L21 8L26 10L30 16L26 22L21 24L20 29H12L11 24L6 22L2 16L6 10L11 8Z"/><circle cx="16" cy="16" r="5"/>',
 play:'<path d="M10 4L28 16L10 28Z"/>',
 sound:'<path d="M3 12H9L17 5V27L9 20H3ZM22 11Q28 16 22 21M25 5Q37 16 25 27"/>',
 coin:'<circle cx="16" cy="16" r="12"/><circle cx="16" cy="16" r="8"/><path d="M13 11H19V21H13Z"/>',
 tower:'<path d="M7 3H11V8H14V3H18V8H21V3H25V12L22 15V26H26V29H6V26H10V15L7 12Z"/><path d="M14 20H18V26H14Z"/>',
 home:'<path d="M3 15L16 3L29 15M7 12V29H25V12M13 29V19H19V29"/>',
 close:'<path d="M6 6L26 26M26 6L6 26"/>',
 pause:'<path d="M8 5H12V27H8ZM20 5H24V27H20Z"/>',
};
/** Small line-art icons; accepts item and ability identifiers as loose aliases. */
export function iconSVG(name, {size=32,color='currentColor'}={}) {
  let key=String(name||'magic').toLowerCase();
  if(!ICONS[key]) {
    if(/boot|shoe/.test(key)) key='boots'; else if(/plate|armor|mail|guard/.test(key)) key='armor';
    else if(/cloak|weave/.test(key)) key='cloak'; else if(/heart|blood|life|heal/.test(key)) key='heart';
    else if(/blade|sword|scythe/.test(key)) key='sword'; else if(/spear|pierc/.test(key)) key='spear';
    else if(/scepter|wand|frost|winter/.test(key)) key='wand'; else if(/book|tome/.test(key)) key='book';
    else if(/ring|orb/.test(key)) key='ring'; else if(/bow|arrow/.test(key)) key='bow'; else key='magic';
  }
  const s=Math.max(8,Math.min(256,Number(size)||32));
  const c=String(color).replace(/[<>"']/g,'');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 32 32" fill="none" stroke="${c}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[key]}</svg>`;
}
