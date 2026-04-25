import { Projectile } from './Projectile.js';
import { SpriteManager } from '../engine/SpriteManager.js';
import { WEAPON_DB, MATERIAL_DB, QUALITY_COEFFS } from './WeaponData.js';
import { SoundManager } from '../engine/SoundManager.js';

/**
 * Tower.js
 * ?꾩옣??諛곗튂?섏뼱 ?곸쓣 怨듦꺽?섎뒗 紐⑤뱺 ?좊떅??踰좎씠???대옒?? */
export class Tower {
  constructor(x, y, gachaResult, gameCore) {
    this.x = x;
    this.y = y;
    this.gameCore = gameCore; 
    
    // 1. 湲곕낯 臾닿린 ?곗씠??諛??덉쭏/?ъ쭏 異붿텧
    this.weaponData = gachaResult.weaponData || WEAPON_DB['留⑥넀/紐⑹옱'];
    this.weaponName = gachaResult.weaponName || this.weaponData.name || '?????녿뒗 臾닿린';
    
    // ?덉쭏 諛??ъ쭏 (??뚮Ц??諛?留ㅽ븨 ?덉젙???뺣낫)
    this.quality = (gachaResult.quality || 'normal').toLowerCase();
    this.material = gachaResult.material || '媛뺤쿋';
    this.weaponType = (this.weaponData.type || 'blunt').toLowerCase();

    // 2. 湲곕낯 ?섏튂 諛?蹂댁젙移??뺣낫
    const baseDmg = Number(this.weaponData.dmg) || 10;
    const baseSpd = Number(this.weaponData.spd) || 0.5;
    const baseAp = Number(this.weaponData.ap) || 0;
    
    const matData = MATERIAL_DB[this.material] || MATERIAL_DB['媛뺤쿋'] || { matMul: 1, spdMul: 1, apMul: 1 };
    const qualMod = QUALITY_COEFFS[this.quality] || 1.0;
    
    const isRanged = this.weaponType === 'ranged';
    const dmgMul = isRanged ? 1.0 : (matData.matMul || 1.0);
    const spdMul = isRanged ? 1.0 : (matData.spdMul || 1.0);
    const apMul = isRanged ? 1.0 : (matData.apMul || 1.0);

    // 3. 理쒖쥌 ?ㅽ꺈 怨꾩궛 諛?寃利?(0 諛⑹?)
    // [UI 媛쒖꽑] '999媛??섎Т紐쎈뫁?? 諛?'苑곸튂寃'? ?ъ쭏/?덉쭏 蹂대꼫?ㅻ? 臾댁떆?섍퀬 湲곕낯 ?깅뒫??媛吏?꾨줉 ?덉쇅 泥섎━
    let finalDmgMul = (this.weaponName.includes('999媛?) || this.weaponName.includes('苑곸튂寃')) ? 1.0 : (dmgMul * qualMod);
    let calcDmg = baseDmg * finalDmgMul;
    
    if (baseDmg > 0 && calcDmg < 1) calcDmg = 1;
    this.baseDamage = Math.floor(calcDmg) || 1; // 理쒖냼 1 蹂댁옣
    
    this.baseAttackSpeed = baseSpd * spdMul;
    this.ap = Math.min(1.0, baseAp * apMul);
    this.baseRange = this.weaponData.range || (isRanged ? 250 : (this.weaponType === 'sharp' ? 100 : 80));

    console.log(`[Tower] ${this.weaponName} ?앹꽦: ATK ${this.baseDamage}, SPD ${this.baseAttackSpeed.toFixed(2)}, Type ${this.weaponType}`);

    this.cooldown = 0;
    this.selected = false;

    // ?좊땲硫붿씠??諛?嫄댁꽕 ?곹깭
    this.isSwinging = false;
    this.swingTimer = 0;
    this.swingDuration = 0.2; 
    this.rotation = 0; 
    this.target = null; 
    this.isBlueprint = true;
    this.auraBuffTimer = 0;
    this.goJuiceTimer = 0; // [New] 怨좎＜??踰꾪봽 ??대㉧
    this.buildProgress = 0;

    // 怨쇱뿴 ?쒖뒪??    this.heat = 0;
    this.maxHeat = 100;
    this.isOverheated = false;
    this.overheatTimer = 0;
    this.overheatDuration = 6.0; 
    
    // ?뱀닔 踰꾪봽 ?곹깭
    this.goJuiceTimer = 0; // 怨좎＜???ъ빟 吏???쒓컙
    this.auraBuffTimer = 0; // 洹쇱쿂 ?섑뀓??吏?≪씠 ?깆뿉 ?섑븳 踰꾪봽 ??대㉧
    this.personaBuffTimer = 0; // [New] ?멸났?먯븘??踰꾪봽 吏????대㉧
    this.personaBuffValue = 1.0; // [New] ?ㅼ젣濡??곸슜諛쏄퀬 ?덈뒗 ?멸났?먯븘??諛곗쑉 (1.2~1.5)

    // ?멸났?먯븘???꾩슜 諛곗쑉 寃곗젙 濡쒖쭅 (1.2 ~ 1.5 媛蹂)
    if (this.weaponData.effect === 'aura_persona') {
        const qWeights = { awful: 1.2, normal: 1.3, excellent: 1.4, legendary: 1.5 };
        const base = qWeights[this.quality] || 1.3;
        // ?덉쭏 湲곗?媛믪뿉??理쒕? 0.05 ?ъ씠???쒕뜡 ?섏튂瑜??뷀븿 (?? 1.5瑜??섏? ?딆쓬)
        this.auraMultiplier = Math.min(1.5, base + (Math.random() * 0.05));
    }
  }

  /**
   * ?덈젴 ?덈꺼怨??뱀닔 踰꾪봽瑜??ы븿???ㅼ떆媛?怨듦꺽??諛섑솚
   */
  get damage() {
    if (!this.gameCore || !this.gameCore.state || !this.gameCore.state.upgrades) return this.baseDamage;
    // GameState??upgrades ?ㅼ? ??뚯쓽 weaponType 留ㅼ묶 ?뺤씤
    let typeKey = this.weaponType;
    if (typeKey === 'melee') typeKey = 'sharp'; // 留ㅽ븨 ?숆린??    
    const lv = this.gameCore.state.upgrades[typeKey] || 0;
    if (typeKey === 'melee') typeKey = 'sharp';
    
    const state = this.gameCore.state;
    const upgradeMul = state.getUpgradeMultiplier(typeKey);
    const encounterManager = this.gameCore.encounterManager;
    const luciMul = encounterManager ? encounterManager.getGlobalLuciferiumMultiplier() : 1.0;
    const moodMul = (state.mood >= 85) ? 1.1 : 1.0;
    const goJuiceMul = (this.goJuiceTimer > 0) ? 1.5 : 1.0;
    const personaMul = (this.personaBuffTimer > 0) ? (this.personaBuffValue || 1.0) : 1.0; 
    
    let currentDmg = Math.floor(this.baseDamage * upgradeMul * luciMul * moodMul * goJuiceMul * personaMul);
    
    // [?덈뱺 ?④낵] ?쒖썝????됯???湲? ?ㅼ떆媛???붾웾 ?곕?吏 異붽?
    if (this.weaponData.effect === 'capitalist_rocket') {
      currentDmg += (state.silver || 0);
    }
    
    return currentDmg;
  }

  /**
   * ?ㅼ떆媛?怨듦꺽 ?띾룄 諛섑솚 (?ㅻ씪 踰꾪봽 ??諛섏쁺)
   */
  get attackSpeed() {
    const auraMul = (this.auraBuffTimer > 0) ? 1.4 : 1.0;
    const goJuiceMul = (this.goJuiceTimer > 0) ? 1.5 : 1.0; // [New] 怨좎＜??怨듭냽 蹂대꼫??    const encounterManager = this.gameCore.encounterManager;
    const globalMul = encounterManager ? encounterManager.getGlobalAttackSpeedMultiplier() : 1.0;
    
    // [Hidden Reward] 洹쇱쐞???媛?? 1.2諛?怨듭냽
    const imperialMul = this.gameCore.state.imperialBuff ? 1.2 : 1.0;
    const personaSpdMul = (this.personaBuffTimer > 0) ? (this.personaBuffValue || 1.0) : 1.0; 
    const moodMul = (this.gameCore.state.mood >= 85) ? 1.1 : 1.0;
    
    return this.baseAttackSpeed * auraMul * goJuiceMul * globalMul * imperialMul * personaSpdMul * moodMul;
  }

  /**
   * ?ㅼ떆媛??ш굅由?諛섑솚 (?몄뭅?댄꽣 諛곗쑉 諛섏쁺)
   */
  get range() {
    const encounterManager = this.gameCore.encounterManager;
    const globalMul = encounterManager ? encounterManager.getGlobalRangeMultiplier() : 1.0;
    return this.baseRange * globalMul;
  }

  update(dt, enemies, addProjectile, globalEffects = { emi: false, luciferium: false }, enemyHash) {
    // ?묒젏 ??컻 泥댄겕 (?먭굅由????臾대젰??
    const isSolarFlare = (this.gameCore.encounterManager && this.gameCore.encounterManager.activeEvents.some(e => e.id === 'solar_flare'));
    const isRanged = this.weaponType === 'ranged';
    
    if (isSolarFlare && isRanged) {
        return; // ?먭굅由???뚮뒗 ?묒젏 ??컻 ???묐룞 以묒?
    }

    if (this.isBlueprint) return;

    // ?몃? ?④낵 諛섏쁺 (EMI ??
    const isAdvanced = this.weaponData.tech === 'advanced';
    this.currentRange = (globalEffects.emi && isAdvanced) ? this.range * 0.5 : this.range;
    this.isLuciferiumActive = globalEffects.luciferium || false;

    if (this.cooldown > 0) this.cooldown -= dt;
    if (this.goJuiceTimer > 0) this.goJuiceTimer -= dt;
    if (this.auraBuffTimer > 0) this.auraBuffTimer -= dt;
    if (this.auraBuffTimer > 0) this.auraBuffTimer -= dt;
    if (this.personaBuffTimer > 0) {
        this.personaBuffTimer -= dt;
        if (this.personaBuffTimer <= 0) this.personaBuffValue = 1.0; // 踰꾪봽 醫낅즺 ??珥덇린??    }

    // [New] ?멸났?먯븘???ㅻ씪 諛쒖궛 (二쇰? ???媛뺥솕)
    if (this.weaponData.effect === 'aura_persona') {
      this.gameCore.units.forEach(u => {
        if (u !== this && !u.isBlueprint && Math.hypot(u.x - this.x, u.y - this.y) < this.range) {
          u.personaBuffTimer = 0.2; 
          u.personaBuffValue = Math.max(u.personaBuffValue || 1.0, this.auraMultiplier);
        }
      });
      return; // [Fix] ?멸났?먯븘?듭? 怨듦꺽???섏? ?딆쓬
    }

    // 怨쇱뿴 泥섎━
    if (this.isOverheated) {
      this.overheatTimer -= dt;
      // 怨쇱뿴 寃뚯씠吏媛 4珥덉뿉 嫄몄퀜 ?쒓컖?곸쑝濡?以꾩뼱?ㅻ룄濡??숆린??      this.heat = (this.overheatTimer / this.overheatDuration) * this.maxHeat;
      
      if (this.overheatTimer <= 0) {
        this.isOverheated = false;
        this.heat = 0;
      }
      return;
      return;
    }

    if (this.auraBuffTimer > 0) this.auraBuffTimer -= dt;
    if (this.goJuiceTimer > 0) this.goJuiceTimer -= dt;

    // ?섎몢瑜닿린 ?좊땲硫붿씠???낅뜲?댄듃
    if (this.isSwinging) {
      this.swingTimer -= dt;
      if (this.swingTimer <= 0) {
        this.isSwinging = false;
        this.rotation = 0;
      } else {
        const progress = 1 - (this.swingTimer / this.swingDuration);
        this.rotation = Math.sin(progress * Math.PI) * 1.2; 
      }
    }

    // 3. ?뱀닔 ?④낵: ?ㅻ씪(Aura) 泥섎━
    this.handleAuras(enemies, dt);

    // 4. 怨듦꺽 ?쒖쟾
    if (this.cooldown <= 0) {
      const multiTargetEffects = ['multi_bullet', 'instant_multi', 'melee_aoe'];
      if (multiTargetEffects.includes(this.weaponData.effect)) {
        const searchList = enemyHash ? enemyHash.getNearby(this.x, this.y, this.currentRange || this.range) : enemies;
        const targets = searchList.filter(en => en.active && Math.hypot(en.x - this.x, en.y - this.y) <= (this.currentRange || this.range));
        if (targets.length > 0) {
          this.target = targets[0]; // [Fix] 愿묒뿭 怨듦꺽 ?쒖뿉??泥?踰덉㎏ ?곸쓣 湲곗??쇰줈 ?섎몢瑜닿린 諛⑺뼢 寃곗젙
          this.fire(targets, addProjectile); // 紐⑤뱺 ??곸뿉寃?諛쒖궗
          if (!this.isOverheated) {
            this.cooldown = 1.0 / this.attackSpeed;
          }
        }
      } else {
        const target = this.findTarget(enemies, enemyHash);
        if (target) {
          this.target = target;
          this.fire(target, addProjectile);
          if (!this.isOverheated) {
            this.cooldown = 1.0 / this.attackSpeed;
          }
        }
      }
    }
  }

  /**
   * 二쇰? ?꾧뎔?먭쾶 ?곹뼢??二쇰뒗 ?ㅻ씪 濡쒖쭅
   */
  handleAuras(enemies, dt) {
    if (this.weaponData.effect === 'aura_cd') {
      // 二쇰? ?꾧뎔?먭쾶 怨듭냽 踰꾪봽 遺??(??대㉧ 媛깆떊 諛⑹떇)
      this.gameCore.units.forEach(u => {
        if (u !== this && !u.isBlueprint && Math.hypot(u.x - this.x, u.y - this.y) < this.range) {
          u.auraBuffTimer = 0.2; // 吏?띿쟻??媛깆떊
        }
      });
    }
  }

  /**
   * [Optimization] 공간 분할을 사용하여 범위 내에서 가장 앞선 적을 탐색
   */
  findTarget(enemies, enemyHash) {
    let bestTarget = null;
    let maxDist = -1;

    const searchList = enemyHash ? enemyHash.getNearby(this.x, this.y, this.currentRange || this.range) : enemies;

    for (const enemy of searchList) {
      if (!enemy.active) continue;
      
      const dx = enemy.x - this.x;
      const dy = enemy.y - this.y;
      const distToEnemy = Math.hypot(dx, dy);

      if (distToEnemy <= (this.currentRange || this.range)) {
        if (enemy.distanceTraveled > maxDist) {
          maxDist = enemy.distanceTraveled;
          bestTarget = enemy;
        }
      }
    }
    return bestTarget;
  }

  /**
   * ?좊떅??怨듦꺽 ?쒖쟾 (?ъ궗泥??앹꽦 ?뱀? 吏곸젒 ?寃?
   */
  fire(target, addProjectile) {
    const isRanged = this.weaponType && String(this.weaponType).toLowerCase().trim() === 'ranged';
    const burstCount = this.weaponData.burst || 1;
    const effect = this.weaponData.effect;

    // [Sound] 臾닿린蹂?怨듦꺽 ?ъ슫???ъ깮
    if (this.weaponData.attackSound) {
      // [Volume Balance] ?뱀젙 ?ъ슫?쒕뱾???묎쾶 ?뱀쓬?섏뼱 蹂쇰ⅷ??媛쒕퀎?곸쑝濡?利앺룺
      let fireVol = 0.4;
      if (this.weaponData.attackSound.includes('?묒??붽린?섎몢瑜대뒗?뚮━.ogg')) {
        fireVol = 0.85;
      } else if (this.weaponData.attackSound.includes('GunShotA.ogg')) {
        fireVol = 0.8;
      }
      SoundManager.playSFX(this.weaponData.attackSound, fireVol, SoundManager.PRIORITY.LOW, 'weapon');
    }

    if (isRanged) {
      const targetList = Array.isArray(target) ? target : [target];
      
      // [New] 利됱떆 ?꾩쑀???寃?(鍮?由ы뵾?곗슜)
      if (effect === 'instant_multi') {
        targetList.forEach(t => {
           t.takeDamage(
             this.damage, this.ap, effect, 
             this.weaponData.grade, this.weaponData.shred || 0,
             !!this.weaponData.isTrueDamage,
             this.weaponName
           );
        });
        return; 
      }

      targetList.forEach(t => {
        for (let i = 0; i < burstCount; i++) {
          setTimeout(() => {
            if (!t.active) return;
            const p = Projectile.get(
              this.x, this.y, t, this.damage, this.ap, 
              this.weaponData.effect, SpriteManager.getColor(this.quality),
              this.weaponData.grade,
              this.weaponData.shred || 0,
              !!this.weaponData.isTrueDamage
            );
            p.shooterName = this.weaponName;
            addProjectile(p);
          }, i * 50);
        }
      });
 
      // ?뱀닔 踰붿쐞 ?④낵 泥섎━
      if (this.weaponData.effect === 'map_aoe') {
        document.dispatchEvent(new CustomEvent('mapHit', { 
          detail: { damage: this.damage, ap: this.ap, qualityColor: SpriteManager.getColor(this.quality) } 
        }));
      }

      // 誘몃땲嫄??꾩슜 怨쇱뿴 濡쒖쭅
      if (this.weaponName === '誘몃땲嫄?) {
        this.heat += burstCount * 1.2;
        if (this.heat >= this.maxHeat) {
          this.isOverheated = true;
          this.overheatTimer = this.overheatDuration;
          this.cooldown = this.overheatDuration;
        }
      }
    } else {
      // 洹쇱젒 ?좊땲硫붿씠??諛??곕?吏
      this.isSwinging = true;
      this.swingTimer = this.swingDuration;
      
      const targetList = Array.isArray(target) ? target : [target];
      
      targetList.forEach(t => {
        for (let i = 0; i < burstCount; i++) {
          setTimeout(() => {
            if (!t.active) return;
            t.takeDamage(
              this.damage, this.ap, this.weaponData.effect, 
              this.weaponData.grade, this.weaponData.shred || 0,
              !!this.weaponData.isTrueDamage,
              this.weaponName
            );
            
            const effect = this.weaponData.effect;
            if (effect === 'splash' || effect === 'splash_knockback') {
              document.dispatchEvent(new CustomEvent('meleeSplash', { 
                detail: { x: t.x, y: t.y, radius: 60, damage: this.damage * 0.5, ap: this.ap, effect: effect, shooterGrade: this.weaponData.grade } 
              }));
            }
          }, i * 50);
        }
      });
    }
  }

  render(ctx) {
    const weaponImg = SpriteManager.getImage(this.weaponName);
    
    if (weaponImg && weaponImg.complete) {
      ctx.save();
      if (this.isBlueprint) ctx.globalAlpha = 0.4;

      // ?뱀닔 ?좊떅 ?쒓컖 ?④낵 泥섎━
      this.drawSpecialEffect(ctx);

      // ?섑뀓??吏?≪씠 ?ㅼ삤???곗텧 (媛?먮떎? ?먯꽑)
      if (this.weaponData.effect === 'aura_cd' && !this.isBlueprint) {
        ctx.save();
        ctx.strokeStyle = 'rgba(0, 242, 255, 0.4)'; // 醫 ???좊챸??????щ챸?섍쾶
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 8]); // 媛?먮떎? ?먯꽑 ?⑦꽩
        ctx.lineDashOffset = -Date.now() * 0.01; // 泥쒖쿇???뚯쟾?섎뒗 ?④낵
        
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.range, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // [New] ?멸났?먯븘??踰꾪봽 ?섑삙 ??遺됱? 湲濡쒖슦 媛뺤“
      if (this.personaBuffTimer > 0 && !this.isBlueprint) {
        ctx.shadowBlur = 25;
        ctx.shadowColor = "rgba(255, 0, 0, 0.8)";
      } else {
        ctx.shadowBlur = 25;
        ctx.shadowColor = SpriteManager.getColor(this.quality);
      }
      
      const size = 48; 
      ctx.translate(this.x, this.y);
      if (this.isSwinging && this.target) {
        const dx = this.target.x - this.x;
        const dy = this.target.y - this.y;
        ctx.rotate(Math.atan2(dy, dx) + this.rotation);
      }
      
      ctx.drawImage(weaponImg, -size / 2, -size / 2, size, size);
      ctx.restore();
    } else {
      ctx.fillStyle = SpriteManager.getColor(this.quality);
      ctx.beginPath(); ctx.rect(this.x - 15, this.y - 15, 30, 30); ctx.fill();
    }

    if (this.selected) {
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.beginPath(); ctx.arc(this.x, this.y, this.currentRange || this.range, 0, Math.PI * 2); ctx.stroke();
      
      // [New] ?대┃ ???숈씪 ?좊떅 ?곌껐???쒖떆
      if (this.isCombinable) {
        ctx.save();
        ctx.setLineDash([10, 5]);
        ctx.lineWidth = 1;
        this.gameCore.units.forEach(u => {
          if (u !== this && !u.isBlueprint && u.weaponName === this.weaponName && u.weaponData.grade === this.weaponData.grade) {
            ctx.strokeStyle = 'rgba(155, 89, 182, 0.6)';
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(u.x, u.y);
            ctx.stroke();
          }
        });
        ctx.restore();
      }
    }

    this.drawGauges(ctx);
  }

  // ?뱀닔 鍮꾩＜???④낵 ?듯빀 ?뚮뜑留?  drawSpecialEffect(ctx) {
    if (this.isBlueprint) return;
    const time = Date.now() * 0.003;

    // [New] 議고빀 媛???ㅼ삤???쒖떆 (蹂대씪???뚮룞)
    if (this.isCombinable) {
      const pulse = Math.sin(Date.now() * 0.005) * 5;
      ctx.save();
      ctx.strokeStyle = 'rgba(162, 0, 255, 0.8)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.arc(this.x, this.y, 30 + pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    if (this.weaponName === '?꾩꽕??苑곸튂寃') {
      const glowSize = 45 + Math.sin(time) * 8;
      const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, glowSize);
      grad.addColorStop(0, 'rgba(0, 191, 255, 0.7)');
      grad.addColorStop(1, 'rgba(0, 121, 255, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(this.x, this.y, glowSize, 0, Math.PI * 2); ctx.fill();
    } else if (this.weaponData.effect === 'aura_persona') {
      // ?멸났?먯븘??遺됱? ?ㅼ삤??      const pulse = Math.sin(Date.now() * 0.003) * 0.2 + 0.8;
      const glowSize = this.range;
      const grad = ctx.createRadialGradient(this.x, this.y, 10, this.x, this.y, glowSize);
      grad.addColorStop(0, `rgba(255, 0, 0, ${0.15 * pulse})`);
      grad.addColorStop(1, 'rgba(255, 0, 0, 0)');
      
      ctx.save();
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(this.x, this.y, glowSize, 0, Math.PI * 2); ctx.fill();
      
      // 踰붿쐞 ?뚮몢由??먯꽑 ?곗텧
      ctx.strokeStyle = `rgba(255, 50, 50, ${0.3 * pulse})`;
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 10]);
      ctx.beginPath(); ctx.arc(this.x, this.y, glowSize, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    } else if (this.weaponName === '999媛??섎Т紐쎈뫁??) {
      const glowSize = 50 + Math.sin(time) * 10;
      const gradient = ctx.createRadialGradient(this.x, this.y, 5, this.x, this.y, glowSize);
      gradient.addColorStop(0, 'rgba(255, 215, 0, 0.9)');
      gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath(); ctx.arc(this.x, this.y, glowSize, 0, Math.PI * 2); ctx.fill();
    }

    if (this.material === '鍮꾩랬?? || this.material === 'Jade') {
      const jadeTime = Date.now() * 0.002;
      const jadePulse = Math.sin(jadeTime) * 5;
      
      ctx.save();
      // ?곷”??鍮꾩랬???ㅻ씪 (Emerald Glow)
      const grad = ctx.createRadialGradient(this.x, this.y, 10, this.x, this.y, 35 + jadePulse);
      grad.addColorStop(0, 'rgba(46, 204, 113, 0.4)');
      grad.addColorStop(0.5, 'rgba(46, 204, 113, 0.1)');
      grad.addColorStop(1, 'rgba(46, 204, 113, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(this.x, this.y, 35 + jadePulse, 0, Math.PI * 2);
      ctx.fill();
      
      // ?뚯쟾?섎뒗 ?먯꽑 ?뚮몢由?      ctx.strokeStyle = 'rgba(46, 204, 113, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 5]);
      ctx.lineDashOffset = -jadeTime * 20;
      ctx.beginPath();
      ctx.arc(this.x, this.y, 25, 0, Math.PI * 2);
      ctx.stroke();

      // [Tag] JADE ?띿뒪???쒖떆
      ctx.fillStyle = '#2ecc71';
      ctx.font = 'bold 10px Inter';
      ctx.textAlign = 'center';
      ctx.shadowBlur = 5;
      ctx.shadowColor = '#000';
      ctx.fillText('JADE', this.x, this.y + 20);
      ctx.restore();
    }
  }

  // 泥대젰 諛?怨쇱뿴 寃뚯씠吏 ?뚮뜑留?  drawGauges(ctx) {
    const barW = 60; // ?덈퉬 ?뺤옣
    const barH = 6;  // ?먭퍡 ?뺤옣
    const bx = this.x - barW / 2;

    if (this.isBlueprint) {
      const by = this.y + 25;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(bx, by, barW, barH);
      ctx.fillStyle = '#00ff88';
      ctx.fillRect(bx, by, barW * (this.buildProgress / 100), barH);
    }

    if (this.heat > 0 || this.isOverheated) {
      // ?꾩튂瑜??ㅼ떆 ????꾨옒濡?議곗젙
      const by = this.y + 25; 
      
      // 諛곌꼍 諛뺤뒪 (???대몼寃?
      ctx.fillStyle = 'rgba(0,0,0,0.8)';
      ctx.fillRect(bx - 1, by - 1, barW + 2, barH + 2);
      
      const heatRatio = Math.min(1.0, this.heat / this.maxHeat);
      
      // 怨쇱뿴 ??媛뺣젹??遺됱??? ?꾨땺 ?쒖뿉??遺됱???怨꾩뿴 ?좎?
      if (this.isOverheated) {
          ctx.fillStyle = '#ff3333'; // 怨쇱뿴 以묒씤 諛앹? 鍮④컯
      } else {
          // ?댁씠 ?ㅻ??섎줉 ??吏꾪븳 鍮④컙?됱쑝濡?蹂??          ctx.fillStyle = `rgb(${150 + heatRatio * 105}, 0, 0)`;
      }
      
      ctx.fillRect(bx, by, barW * heatRatio, barH);

      // ?뚮몢由?異붽?
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.strokeRect(bx, by, barW, barH);

      if (this.isOverheated) {
        const bounce = Math.sin(Date.now() * 0.01) * 2;
        ctx.fillStyle = '#ff4444';
        ctx.font = 'bold 12px Inter';
        ctx.textAlign = 'center';
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#ff0000';
        ctx.fillText('OVERHEAT COOLING...', this.x, by + 18 + bounce);
        ctx.shadowBlur = 0;
      }
    }
  }

  /**
   * [New] ????꾩슜 ?④낵 ?곸슜 硫붿꽌??(怨좎＜????
   */
  applyEffect(type, duration) {
    if (type === 'go_juice') {
        this.goJuiceTimer = Math.max(this.goJuiceTimer, duration);
    }
  }
}
