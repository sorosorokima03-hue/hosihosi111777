window.gLocalAssetContainer["main"] = function(g) { (function(exports, require, module, __filename, __dirname) {
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
exports.main = void 0;
function main(param) {
  const scene = createGameScene(param);
  g.game.pushScene(scene);
}
function createGameScene(param) {
  // 【iOS対策】初期読み込みなし
  const scene = new g.Scene({
    game: g.game,
    assetIds: []
  });

  // --- 定数 ---
  const TIME_LIMIT = 300;
  const GAME_TIME_LIMIT = 300;
  const TARGET_TILE_COUNT = 120;
  const TILE_W = 90;
  const TILE_H = 90;
  const GRID_STEP_X = 90;
  const GRID_STEP_Y = 90;
  const DEPTH_OFFSET_X = 17.0;
  const DEPTH_OFFSET_Y = 19.0;
  const OFFSET_X = 30;
  const OFFSET_Y = 80;
  const TILE_TYPE_COUNT = 25;
  const MAX_SHUFFLE_HEIGHT = 3;
  const MAX_GRID_X = 12;
  const MAX_GRID_Y = 6;

  // ヒントが出るまでの時間(秒)
  const HINT_DELAY = 7;

  // --- 変数 ---
  const tiles = [];
  let firstSelectedTile = null;
  const history = [];
  let isGameStarted = false;

  // ローディング制御用変数
  let loadingStep = 0;
  let mapDataToBuild = [];
  let builtTileCount = 0;
  let totalTime = TIME_LIMIT;
  let gameTime = GAME_TIME_LIMIT;

  // ヒント機能用タイマー
  let noActionTimer = 0;

  // ▼▼▼ 【ここです！】 音量の初期設定 ▼▼▼
  let currentBGMVolume = 0.8; // BGMの初期音量 (0.0 ~ 1.0)
  const seVolume = 0.4; // SEの初期音量 (0.0 ~ 1.0)
  // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

  let bgmPlayer = null;
  g.game.vars.gameState = {
    score: 0
  };
  scene.onLoad.add(() => {
    // --- フォント生成 ---
    const font = new g.DynamicFont({
      game: g.game,
      fontFamily: "sans-serif",
      size: 32,
      strokeWidth: 5,
      strokeColor: "black",
      fontColor: "white",
      fontWeight: "bold"
    });
    const simpleFont = new g.DynamicFont({
      game: g.game,
      fontFamily: "sans-serif",
      size: 24,
      fontColor: "black"
    });
    const arrowFont = new g.DynamicFont({
      game: g.game,
      fontFamily: "sans-serif",
      size: 60,
      strokeWidth: 4,
      strokeColor: "white",
      fontColor: "white",
      fontWeight: "bold"
    });

    // --- レイヤー構成 ---
    const bgLayer = new g.E({
      scene: scene
    });
    scene.append(bgLayer);
    const mapLayer = new g.E({
      scene: scene
    });
    scene.append(mapLayer);
    const uiLayer = new g.E({
      scene: scene
    });
    scene.append(uiLayer);
    const messageLayer = new g.E({
      scene: scene
    });
    scene.append(messageLayer);

    // --- 背景 (予備色) ---
    const fallbackBg = new g.FilledRect({
      scene: scene,
      width: g.game.width,
      height: g.game.height,
      cssColor: "#e0e0e0"
    });
    bgLayer.append(fallbackBg);

    // --- スタート画面 ---
    const startScreenGroup = new g.E({
      scene: scene
    });
    messageLayer.append(startScreenGroup);
    const pushStartMessage = new g.Label({
      scene: scene,
      text: "PUSH START",
      font: font,
      fontSize: 80,
      x: 0,
      y: g.game.height / 2 - 40,
      width: g.game.width,
      textAlign: "center",
      cssColor: "red"
    });
    startScreenGroup.append(pushStartMessage);

    // --- 変数定義 ---
    let seAudioAsset = null;
    let kyoryuAsset = null;
    let SRC_TILE_W = 0;
    let SRC_TILE_H = 0;

    // --- UI要素 ---
    let timeGaugeBg, timeGaugeBar, timeLabel, tileCountLabel, scoreLabel, undoBtnGroup, undoBg, undoText, bgmVolLabel, bgmVolBg, bgmVolBar, bgmVolTouch, seVolLabel, seVolBg, seVolBar, seVolTouch;

    // --- 関数群 ---
    const startBGM = () => {
      const dinasBGM = scene.asset.getAudioById("dinas");
      if (dinasBGM) {
        try {
          if (bgmPlayer && !bgmPlayer.destroyed()) bgmPlayer.stop();
          bgmPlayer = dinasBGM.play();
          bgmPlayer.loop = true;
          bgmPlayer.changeVolume(currentBGMVolume);
        } catch (e) {
          console.log("BGM Error:", e);
        }
      }
    };
    const playSe = () => {
      if (seAudioAsset) {
        try {
          seAudioAsset.play().changeVolume(seVolume);
        } catch (e) {}
      }
    };
    const initUI = () => {
      const gaugeHeight = 40;
      timeGaugeBg = new g.FilledRect({
        scene: scene,
        width: g.game.width,
        height: gaugeHeight,
        cssColor: "#333333",
        x: 0,
        y: 0
      });
      uiLayer.append(timeGaugeBg);
      timeGaugeBar = new g.FilledRect({
        scene: scene,
        width: g.game.width,
        height: gaugeHeight,
        cssColor: "#00ff00",
        x: 0,
        y: 0
      });
      uiLayer.append(timeGaugeBar);
      timeLabel = new g.Label({
        scene: scene,
        text: "TIME: " + GAME_TIME_LIMIT,
        font: font,
        fontSize: 32,
        x: 20,
        y: 4
      });
      uiLayer.append(timeLabel);
      tileCountLabel = new g.Label({
        scene: scene,
        text: "TILES: 00",
        font: font,
        fontSize: 32,
        x: 20,
        y: gaugeHeight + 4
      });
      uiLayer.append(tileCountLabel);
      scoreLabel = new g.Label({
        scene: scene,
        text: "SCORE: 0",
        font: font,
        fontSize: 32,
        x: g.game.width - 300,
        y: 4
      });
      uiLayer.append(scoreLabel);
      const sideBarX = 1180;
      undoBtnGroup = new g.E({
        scene: scene,
        x: sideBarX,
        y: 120,
        width: 80,
        height: 120,
        touchable: true
      });
      undoBg = new g.FilledRect({
        scene: scene,
        width: 80,
        height: 120,
        cssColor: "#4488ff",
        rx: 8
      });
      undoText = new g.Label({
        scene: scene,
        text: "←",
        font: arrowFont,
        fontSize: 60,
        x: 8,
        y: 25,
        width: 80,
        textAlign: "center"
      });
      undoBtnGroup.append(undoBg);
      undoBtnGroup.append(undoText);
      uiLayer.append(undoBtnGroup);
      undoBtnGroup.pointDown.add(() => {
        if (!isGameStarted) return;
        resetHint(); // 操作があったらヒントリセット
        undoBg.cssColor = "#2255aa";
        undoBg.modified();
      });
      undoBtnGroup.pointUp.add(() => {
        if (!isGameStarted) return;
        undoBg.cssColor = "#4488ff";
        undoBg.modified();
        executeUndo();
      });

      // 音量バー設定
      const volAreaY = 320,
        volHeight = 250,
        volBarW = 30,
        volGap = 50;
      const bgmBarX = sideBarX - 10,
        seBarX = sideBarX + volGap;
      const createVolBar = (name, x, color) => {
        const label = new g.Label({
          scene: scene,
          text: name,
          font: simpleFont,
          fontSize: 20,
          x: x,
          y: volAreaY - 30,
          textAlign: "center",
          width: volBarW
        });
        uiLayer.append(label);
        const bg = new g.FilledRect({
          scene: scene,
          x: x,
          y: volAreaY,
          width: volBarW,
          height: volHeight,
          cssColor: "#cccccc"
        });
        uiLayer.append(bg);
        const bar = new g.FilledRect({
          scene: scene,
          x: x,
          y: volAreaY + volHeight,
          width: volBarW,
          height: 0,
          cssColor: color
        });
        uiLayer.append(bar);
        const touch = new g.FilledRect({
          scene: scene,
          x: x - 10,
          y: volAreaY - 20,
          width: volBarW + 20,
          height: volHeight + 40,
          cssColor: "black",
          opacity: 0,
          touchable: true
        });
        uiLayer.append(touch);
        return {
          label,
          bg,
          bar,
          touch
        };
      };
      const bgmObj = createVolBar("BGM", bgmBarX, "#00aaff");
      bgmVolLabel = bgmObj.label;
      bgmVolBg = bgmObj.bg;
      bgmVolBar = bgmObj.bar;
      bgmVolTouch = bgmObj.touch;
      const seObj = createVolBar("SE", seBarX, "#ffaa00");
      seVolLabel = seObj.label;
      seVolBg = seObj.bg;
      seVolBar = seObj.bar;
      seVolTouch = seObj.touch;
      const updateVolume = (bar, ratio) => {
        bar.height = volHeight * ratio;
        bar.y = volAreaY + (volHeight - bar.height);
        bar.modified();
      };
      // 操作時にヒントリセット
      bgmVolTouch.pointDown.add(ev => {
        resetHint();
        const r = Math.max(0, Math.min(1, 1.0 - (ev.point.y + (bgmVolTouch.y - volAreaY)) / volHeight));
        currentBGMVolume = r;
        g.game.audio.music.volume = r;
        updateVolume(bgmVolBar, r);
        if (bgmPlayer) bgmPlayer.changeVolume(r);
      });
      bgmVolTouch.pointMove.add(ev => {
        const r = Math.max(0, Math.min(1, 1.0 - (ev.point.y + (bgmVolTouch.y - volAreaY)) / volHeight));
        currentBGMVolume = r;
        g.game.audio.music.volume = r;
        updateVolume(bgmVolBar, r);
        if (bgmPlayer) bgmPlayer.changeVolume(r);
      });
      seVolTouch.pointDown.add(ev => {
        resetHint();
        const r = Math.max(0, Math.min(1, 1.0 - (ev.point.y + (seVolTouch.y - volAreaY)) / volHeight));
        g.game.audio.sound.volume = r;
        updateVolume(seVolBar, r);
      });
      seVolTouch.pointMove.add(ev => {
        const r = Math.max(0, Math.min(1, 1.0 - (ev.point.y + (seVolTouch.y - volAreaY)) / volHeight));
        g.game.audio.sound.volume = r;
        updateVolume(seVolBar, r);
      });
      g.game.audio.music.volume = currentBGMVolume;
      updateVolume(bgmVolBar, currentBGMVolume);
      g.game.audio.sound.volume = seVolume;
      updateVolume(seVolBar, seVolume);
    };

    // --- 牌クラス ---
    class Tile extends g.E {
      constructor(id, gx, gy, gz) {
        super({
          scene: scene,
          width: TILE_W,
          height: TILE_H
        });
        this.tileId = id;
        this.gx = gx;
        this.gy = gy;
        this.gz = gz;
        this.active = true;
        this.isSelected = false;
        this.isHinted = false; // ヒント表示フラグ

        this.x = gx * GRID_STEP_X - gz * DEPTH_OFFSET_X + OFFSET_X;
        this.y = gy * GRID_STEP_Y - gz * DEPTH_OFFSET_Y + OFFSET_Y;
        this.shadow = new g.FilledRect({
          scene: scene,
          width: TILE_W,
          height: TILE_H,
          cssColor: "#000000",
          opacity: 0.3,
          x: 6,
          y: 6
        });
        this.append(this.shadow);
        if (kyoryuAsset) {
          this.sprite = new g.FrameSprite({
            scene: scene,
            src: kyoryuAsset,
            width: TILE_W,
            height: TILE_H,
            srcWidth: SRC_TILE_W,
            srcHeight: SRC_TILE_H,
            frames: [this.tileId],
            x: 0,
            y: 0
          });
          this.append(this.sprite);
        } else {
          this.dummyRect = new g.FilledRect({
            scene: scene,
            width: TILE_W,
            height: TILE_H,
            cssColor: "gray"
          });
          this.append(this.dummyRect);
        }

        // 選択時のハイライト (黄色)
        this.highlight = new g.FilledRect({
          scene: scene,
          width: TILE_W,
          height: TILE_H,
          cssColor: "#ffff00",
          opacity: 0,
          hidden: false
        });
        this.append(this.highlight);

        // ヒント用のハイライト (赤色)
        this.hintHighlight = new g.FilledRect({
          scene: scene,
          width: TILE_W,
          height: TILE_H,
          cssColor: "#ff0000",
          opacity: 0,
          hidden: false
        });
        this.append(this.hintHighlight);
        this.touchable = false;
        this.pointDown.add(() => onTileClicked(this));
        this.update.add(() => {
          // 選択時の点滅 (黄色)
          if (this.isSelected) {
            this.highlight.opacity = (Math.sin(g.game.age / 4) + 1) / 2 * 0.4 + 0.2;
          } else {
            this.highlight.opacity = 0;
          }
          this.highlight.modified();

          // ヒント時の点滅 (赤色)
          if (this.isHinted && !this.isSelected) {
            this.hintHighlight.opacity = (Math.sin(g.game.age / 4) + 1) / 2 * 0.5 + 0.2;
          } else {
            this.hintHighlight.opacity = 0;
          }
          this.hintHighlight.modified();
        });
      }
      updateId(newId) {
        this.tileId = newId;
        if (this.sprite) {
          this.sprite.frames = [newId];
          this.sprite.modified();
        }
      }
      setSelected(value) {
        this.isSelected = value;
      }
      setHint(value) {
        this.isHinted = value;
      }
      revive() {
        this.active = true;
        this.show();
        this.touchable = true;
        this.isSelected = false;
        this.isHinted = false;
      }
      remove() {
        this.active = false;
        this.hide();
        this.touchable = false;
        this.isHinted = false;
      }
      destroyChildren() {
        var _this$children;
        (_this$children = this.children) === null || _this$children === void 0 || _this$children.forEach(c => {
          if (c && !c.destroyed()) c.destroy();
        });
      }
    }

    // --- ゲームロジック ---
    function canRemoveSim(t, list) {
      const above = list.some(o => o !== t && o.gx === t.gx && o.gy === t.gy && o.gz === t.gz + 1);
      if (above) return false;
      let l = false,
        r = false;
      list.forEach(o => {
        if (o === t) return;
        if (o.gz === t.gz && o.gy === t.gy) {
          if (o.gx === t.gx - 1) l = true;
          if (o.gx === t.gx + 1) r = true;
        }
      });
      return !(l && r);
    }
    function assignSolvableIds(skeleton) {
      let remaining = skeleton.map(s => _objectSpread({}, s));
      const pairs = [];
      while (remaining.length > 0) {
        const candidates = remaining.filter(s => canRemoveSim(s, remaining));
        if (candidates.length < 2) {
          if (remaining.length >= 2) {
            let c1 = remaining[0],
              c2 = remaining[1];
            if (c1.gx === c2.gx && c1.gy === c2.gy) {
              let found = false;
              for (let k = 2; k < remaining.length; k++) {
                if (remaining[k].gx !== c1.gx || remaining[k].gy !== c1.gy) {
                  c2 = remaining[k];
                  remaining.splice(k, 1);
                  remaining.shift();
                  found = true;
                  break;
                }
              }
              if (!found) remaining.splice(0, 2);
            } else {
              remaining.splice(0, 2);
            }
            pairs.push([c1, c2]);
          } else break;
        } else {
          const i1 = g.game.random.get(0, candidates.length - 1);
          let i2 = g.game.random.get(0, candidates.length - 1);
          while (i1 === i2 && candidates.length > 1) i2 = g.game.random.get(0, candidates.length - 1);
          const c1 = candidates[i1];
          const c2 = candidates[i2];
          if (c1.gx === c2.gx && c1.gy === c2.gy) continue;
          pairs.push([c1, c2]);
          remaining = remaining.filter(r => r !== c1 && r !== c2);
        }
      }
      const ids = [];
      for (let i = 0; i < pairs.length; i++) ids.push(i % TILE_TYPE_COUNT);
      for (let i = ids.length - 1; i > 0; i--) {
        const j = g.game.random.get(0, i);
        [ids[i], ids[j]] = [ids[j], ids[i]];
      }
      const finalLayout = [];
      pairs.forEach((p, i) => {
        finalLayout.push({
          gx: p[0].gx,
          gy: p[0].gy,
          gz: p[0].gz,
          tileId: ids[i]
        });
        finalLayout.push({
          gx: p[1].gx,
          gy: p[1].gy,
          gz: p[1].gz,
          tileId: ids[i]
        });
      });
      return finalLayout;
    }
    function createSkeleton(isInitial) {
      let skeleton = [];
      for (let y = 1; y < MAX_GRID_Y; y++) {
        for (let x = 2; x < MAX_GRID_X - 1; x++) {
          const density = isInitial ? 90 : 80;
          if (g.game.random.get(0, 100) < density) skeleton.push({
            gx: x,
            gy: y,
            gz: 0
          });
        }
      }
      let safety = 0;
      while (skeleton.length < TARGET_TILE_COUNT && safety < 6000) {
        safety++;
        const base = skeleton[g.game.random.get(0, skeleton.length - 1)];
        if (base.gz < MAX_SHUFFLE_HEIGHT - 1) {
          if (!skeleton.some(s => s.gx === base.gx && s.gy === base.gy && s.gz === base.gz + 1)) {
            skeleton.push({
              gx: base.gx,
              gy: base.gy,
              gz: base.gz + 1
            });
            continue;
          }
        }
        if (base.gz === 0) {
          const neighbors = [{
            x: 1,
            y: 0
          }, {
            x: -1,
            y: 0
          }, {
            x: 0,
            y: 1
          }, {
            x: 0,
            y: -1
          }];
          const empty = neighbors.map(n => ({
            gx: base.gx + n.x,
            gy: base.gy + n.y,
            gz: 0
          })).find(n => n.gx >= 1 && n.gx < MAX_GRID_X && n.gy >= 1 && n.gy < MAX_GRID_Y && !skeleton.some(s => s.gx === n.gx && s.gy === n.gy && s.gz === 0));
          if (empty) skeleton.push(empty);
        }
      }
      while (skeleton.length > TARGET_TILE_COUNT) skeleton.sort((a, b) => a.gz !== b.gz ? b.gz - a.gz : b.gy - a.gy).shift();
      if (skeleton.length % 2 !== 0) skeleton.sort((a, b) => b.gz - a.gz).shift();
      return skeleton;
    }
    function prepareMapData() {
      if (mapLayer.children) {
        const children = mapLayer.children.concat();
        children.forEach(c => {
          if (c instanceof Tile) c.destroyChildren();
          c.destroy();
        });
      }
      tiles.length = 0;
      const skeleton = createSkeleton(true);
      const mapData = assignSolvableIds(skeleton);
      mapData.sort((a, b) => a.gz !== b.gz ? a.gz - b.gz : a.gy !== b.gy ? a.gy - b.gy : a.gx - b.gx);
      return mapData;
    }
    function createOneTile(d) {
      const t = new Tile(d.tileId, d.gx, d.gy, d.gz);
      mapLayer.append(t);
      tiles.push(t);
    }
    function isRemovable(target) {
      const activeTiles = tiles.filter(t => t.active);
      const blockedAbove = activeTiles.some(o => o.gx === target.gx && o.gy === target.gy && o.gz === target.gz + 1);
      if (blockedAbove) return false;
      let blockedLeft = false,
        blockedRight = false;
      activeTiles.forEach(o => {
        if (o === target) return;
        if (o.gz === target.gz && o.gy === target.gy) {
          if (o.gx === target.gx - 1) blockedLeft = true;
          if (o.gx === target.gx + 1) blockedRight = true;
        }
      });
      return !(blockedLeft && blockedRight);
    }

    // --- ヒント制御 ---
    function resetHint() {
      noActionTimer = 0;
      tiles.forEach(t => t.setHint(false));
    }
    function checkAndShowHint() {
      // 既にヒントが出ているなら何もしない
      if (tiles.some(t => t.isHinted)) return;
      const active = tiles.filter(t => t.active);
      const removables = active.filter(t => isRemovable(t));
      let pair = null;

      // ペアを探す
      for (let i = 0; i < removables.length; i++) {
        for (let j = i + 1; j < removables.length; j++) {
          if (removables[i].tileId === removables[j].tileId) {
            pair = [removables[i], removables[j]];
            break;
          }
        }
        if (pair) break;
      }
      if (pair) {
        pair[0].setHint(true);
        pair[1].setHint(true);
      }
    }
    function checkDeadlockAndReshuffle() {
      resetHint(); // シャッフル時もリセット

      const active = tiles.filter(t => t.active);
      if (active.length === 0) return;
      const removables = active.filter(t => isRemovable(t));
      let hasPair = false;
      for (let i = 0; i < removables.length; i++) {
        for (let j = i + 1; j < removables.length; j++) {
          if (removables[i].tileId === removables[j].tileId) {
            hasPair = true;
            break;
          }
        }
        if (hasPair) break;
      }
      if (!hasPair) {
        const msg = new g.Label({
          scene: scene,
          text: "詰み！牌の種類をシャッフルします",
          font: font,
          fontSize: 48,
          x: 0,
          y: g.game.height / 2 - 50,
          width: g.game.width,
          textAlign: "center"
        });
        messageLayer.append(msg);
        scene.setTimeout(() => {
          const skeleton = active.map(t => ({
            gx: t.gx,
            gy: t.gy,
            gz: t.gz
          }));
          const newLayout = assignSolvableIds(skeleton);
          active.forEach(t => {
            const data = newLayout.find(d => d.gx === t.gx && d.gy === t.gy && d.gz === t.gz);
            if (data) t.updateId(data.tileId);
            t.setSelected(false);
          });
          if (firstSelectedTile) {
            firstSelectedTile.setSelected(false);
            firstSelectedTile = null;
          }
          history.length = 0;
          msg.destroy();
        }, 1500);
      }
    }
    function executeUndo() {
      if (gameTime <= 0 || !isGameStarted || history.length === 0) return;
      const last = history.pop();
      last.t1.revive();
      last.t2.revive();
      g.game.vars.gameState.score = Math.max(0, g.game.vars.gameState.score - last.score);
      scoreLabel.text = "SCORE: " + g.game.vars.gameState.score;
      scoreLabel.invalidate();
      tileCountLabel.text = "TILES: " + tiles.filter(t => t.active).length;
      tileCountLabel.invalidate();
      if (firstSelectedTile) {
        firstSelectedTile.setSelected(false);
        firstSelectedTile = null;
      }
      playSe();
      resetHint(); // アンドゥ時もリセット
    }
    function onTileClicked(tile) {
      if (!isGameStarted || gameTime <= 0 || !isRemovable(tile)) return;
      resetHint(); // 操作があったらリセット
      playSe();
      if (firstSelectedTile === null) {
        firstSelectedTile = tile;
        tile.setSelected(true);
      } else {
        if (firstSelectedTile === tile) {
          tile.setSelected(false);
          firstSelectedTile = null;
        } else if (firstSelectedTile.tileId === tile.tileId) {
          const gain = 1000;
          g.game.vars.gameState.score += gain;
          scoreLabel.text = "SCORE: " + g.game.vars.gameState.score;
          scoreLabel.invalidate();
          history.push({
            t1: firstSelectedTile,
            t2: tile,
            score: gain
          });
          firstSelectedTile.remove();
          tile.remove();
          firstSelectedTile = null;
          const rem = tiles.filter(t => t.active).length;
          tileCountLabel.text = "TILES: " + rem;
          tileCountLabel.invalidate();
          checkDeadlockAndReshuffle();
          if (rem === 0) {
            const clearBonus = 100000;
            const timeBonus = Math.floor(gameTime);
            g.game.vars.gameState.score += clearBonus + timeBonus;
            scoreLabel.text = "CLEAR! " + g.game.vars.gameState.score;
            scoreLabel.invalidate();
            scene.update.remove(updateHandler);
            isGameStarted = false;
          }
        } else {
          firstSelectedTile.setSelected(false);
          firstSelectedTile = tile;
          tile.setSelected(true);
        }
      }
    }
    const toggleGameUI = visible => {
      bgLayer.hidden = !visible;
      if (timeGaugeBg) timeGaugeBg.hidden = !visible;
      if (timeGaugeBar) timeGaugeBar.hidden = !visible;
      if (timeLabel) timeLabel.hidden = !visible;
      if (tileCountLabel) tileCountLabel.hidden = !visible;
      if (scoreLabel) scoreLabel.hidden = !visible;
      if (undoBtnGroup) {
        undoBtnGroup.hidden = !visible;
        undoBtnGroup.touchable = visible;
      }
      if (bgmVolLabel) bgmVolLabel.hidden = !visible;
      if (bgmVolBg) bgmVolBg.hidden = !visible;
      if (bgmVolBar) bgmVolBar.hidden = !visible;
      if (bgmVolTouch) {
        bgmVolTouch.hidden = !visible;
        bgmVolTouch.touchable = visible;
      }
      if (seVolLabel) seVolLabel.hidden = !visible;
      if (seVolBg) seVolBg.hidden = !visible;
      if (seVolBar) seVolBar.hidden = !visible;
      if (seVolTouch) {
        seVolTouch.hidden = !visible;
        seVolTouch.touchable = visible;
      }
      tiles.forEach(t => t.touchable = visible);
    };
    const startGame = () => {
      if (isGameStarted) return;
      scene.pointDownCapture.remove(startGame);
      pushStartMessage.text = "LOADING... 0%";
      pushStartMessage.invalidate();

      // 1. アセット読み込み開始
      scene.requestAssets(["kyoryu", "back", "se", "dinas"], () => {
        // 読み込み完了後、ステップ実行モードへ移行
        loadingStep = 1;
      });
    };
    scene.pointDownCapture.add(startGame);

    // --- メインループ ---
    const updateHandler = () => {
      // ★ LOADINGステップ処理
      if (loadingStep > 0) {
        switch (loadingStep) {
          case 1:
            kyoryuAsset = scene.asset.getImageById("kyoryu");
            const backAsset = scene.asset.getImageById("back");
            seAudioAsset = scene.asset.getAudioById("se");
            const SPLIT_COUNT = 5;
            SRC_TILE_W = kyoryuAsset ? kyoryuAsset.width / SPLIT_COUNT : 0;
            SRC_TILE_H = kyoryuAsset ? kyoryuAsset.height / SPLIT_COUNT : 0;
            if (backAsset) {
              const backgroundSprite = new g.Sprite({
                scene: scene,
                src: backAsset,
                width: g.game.width,
                height: g.game.height
              });
              bgLayer.append(backgroundSprite);
            }
            initUI();
            pushStartMessage.text = "LOADING... 20%";
            pushStartMessage.invalidate();
            loadingStep++;
            break;
          case 2:
            mapDataToBuild = prepareMapData();
            builtTileCount = 0;
            pushStartMessage.text = "LOADING... 40%";
            pushStartMessage.invalidate();
            loadingStep++;
            break;
          case 3:
            const BATCH_SIZE = 20;
            for (let i = 0; i < BATCH_SIZE; i++) {
              if (builtTileCount < mapDataToBuild.length) {
                createOneTile(mapDataToBuild[builtTileCount]);
                builtTileCount++;
              } else {
                loadingStep++;
                break;
              }
            }
            const progress = 40 + Math.floor(builtTileCount / mapDataToBuild.length * 50);
            pushStartMessage.text = "LOADING... " + progress + "%";
            pushStartMessage.invalidate();
            break;
          case 4:
            startScreenGroup.destroy();
            tileCountLabel.text = "TILES: " + tiles.length;
            tileCountLabel.invalidate();
            isGameStarted = true;
            toggleGameUI(true);
            startBGM();
            loadingStep = 0;
            break;
        }
        return;
      }
      if (!isGameStarted) return;

      // ★ ヒント機能用タイマー
      noActionTimer += 1 / g.game.fps;
      if (noActionTimer >= HINT_DELAY) {
        checkAndShowHint();
      }

      // ★ 通常ゲームループ
      totalTime -= 1 / g.game.fps;
      if (isGameStarted && gameTime > 0) gameTime -= 1 / g.game.fps;
      if (gameTime <= 0) {
        gameTime = 0;
        if (isGameStarted) {
          scene.update.remove(updateHandler);

          // 【修正点】TIME UPを中央に大きく表示
          // 既存のtimeLabelは非表示にするか、そのままにするか。今回は中央表示を優先。
          // timeLabel.text = "TIMEUP"; 

          const timeUpLabel = new g.Label({
            scene: scene,
            text: "TIME UP",
            font: font,
            fontSize: 100,
            x: 0,
            y: g.game.height / 2 - 50,
            width: g.game.width,
            textAlign: "center",
            cssColor: "red"
          });
          messageLayer.append(timeUpLabel);
          timeGaugeBar.width = 0;
          tiles.forEach(t => t.touchable = false);
          isGameStarted = false;
        }
      }
      if (gameTime > 0) {
        timeLabel.text = "TIME: " + Math.ceil(gameTime);
        timeLabel.invalidate();
        const ratio = gameTime / GAME_TIME_LIMIT;
        timeGaugeBar.width = g.game.width * ratio;
        timeGaugeBar.cssColor = ratio > 0.5 ? `rgb(${Math.floor((1 - ratio) * 2 * 255)},255,0)` : `rgb(255,${Math.floor(ratio * 2 * 255)},0)`;
        timeGaugeBar.modified();
      }
    };
    scene.update.add(updateHandler);
  });
  return scene;
}
exports.main = main;
})(g.module.exports, g.module.require, g.module, g.filename, g.dirname);
}