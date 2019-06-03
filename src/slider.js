class Slider {
  constructor(renderDom, options){
    // 空函数用于初始化操作结束的回调
    this.NOOP = function () {};     
    // 默认参数
    this.options = {
      scrollingX: false, //启用x轴滚动
      scrollingY: false, //启用y轴滚动
      animating: true, // 启用动画减速，弹回，缩放和滚动
      animationDuration: 250, // 由scrollTo/zoomTo触发的动画持续时间
      bouncing: true, // 启用弹跳(内容可以慢慢移到外面，释放后再弹回来)
      speedMultiplier: 1.5, // 增加或减少滚动速度
      scrollingComplete: this.NOOP, // 在触摸端或减速端后端触发的回调，前提是另一个滚动动作尚未开始。用于知道何时淡出滚动条
      snappingComplete: this.NOOP, // 选择完成后触发的回调事件
      penetrationDeceleration: 0.03, // 这配置了到达边界时应用于减速的更改量
      penetrationAcceleration: 0.08 // 这配置了到达边界时施加于加速度的变化量
    };
    // 参数合并
    for (let key in options) {
      this.options[key] = options[key];
    }
    // 当前的滚动容器信息
    this.container = renderDom.parentNode   // 可视区域容器节点
    this.content = renderDom                // 滚动区域容器节点
    this.contentChildslength = 0            
    // this.render = Render(this.content)      // 渲染函数
    this.animate = Animate;                 // 动画库                  
    // 状态 {Boolean}
    this.isSingleTouch = false        //是否只有一根手指用于触摸操作
    this.isTracking = false           //触摸事件序列是否正在进行中
    this.completeDeceleration = false //是否完成减速动画
    this.isDragging = false           //用户移动的距离是否已达到启用拖动模式的程度。 提示:只有在移动了一些像素后，才可以不被点击等打断。
    this.isDecelerating = false     //是否正在减速中
    this.isAnimating = false        //是否动画正在运行中
    this.enableScrollX = false      //是否开启横向滚动
    this.enableScrollY = false      //是否开启纵向向滚动
    this.refreshActive = false      //现在释放事件时是否启用刷新进程
    this.reachBottomActive = false  //是否已经发送了触底事件
    this.snappingTypeInit = false   // 是否已经初始化了snapping type = center
    //  {Function} 
    this.refreshStartCallBack = null        //执行回调以启动实际刷新
    this.refreshDeactivateCallBack = null   //在停用时执行的回调。这是为了通知用户刷新被取消
    this.refreshActivateCallBack = null     //回调函数，以在激活时执行。这是为了在用户释放时通知他即将发生刷新
    // {Number}
    this.scrollX = 0      //当前在x轴上的滚动位置
    this.scrollY = 0      //当前在y轴上的滚动位置
    this.minWisthScrollX = 0   // 最小允许横向滚动宽度 
    this.minHeightScrollY = 0   // 最小允许纵向滚动高度 
    this.maxWisthScrollX = 0   // 最大允许横向滚动宽度 
    this.maxHeightScrollY = 0   // 最大允许纵向滚动高度 
    this.prevScrollX = 0  // 上一个横向滚动位置
    this.prevScrollY = 0  // 上一个纵向滚动位置

    this.scheduledX = 0   //预定左侧位置(动画时的最终位置)
    this.scheduledY = 0 // 预定的顶部位置(动画时的最终位置)
    this.lastTouchX = 0 //开始时手指的左侧位置
    this.lastTouchY = 0 //开始时手指的顶部位置
    this.decelerationVelocityX = 0 //当前因素修改水平滚动的位置与每一步
    this.decelerationVelocityY = 0 //当前因素修改垂直滚动位置与每一步
    
    this.refreshHeight = 0    // 下拉刷新区域的高度
    this.loadingHeight = 0    // 上拉加载区域的高度
    this.contentWidth = 0     // 滚动内容宽度
    this.contentHeight = 0    // 滚动内容高度
    this.containerWidth = 0   // 可视容器宽度
    this.containerHeight = 0  // 可视容器高度
    this.snapWidth = 50       // 开启网格滑动时网格宽度
    this.snapHeight = 50      // 开启网格滑动时网格高度
    
    this.minDecelerationScrollX = 0 //最小减速时X滚动位置
    this.minDecelerationScrollY = 0 //最小减速时Y滚动位置
    this.maxDecelerationScrollX = 0 //最大减速时X滚动位置
    this.maxDecelerationScrollY = 0 //最大减速时Y滚动位置
    // {Date} 
    this.lastTouchMoveTime = null //手指最后移动的时间戳。用于限制减速速度的跟踪范围。
    // {Array} List 
    this.positionsArray = null //位置列表，每个状态使用三个索引=左、上、时间戳
    // 事件监听
    this.initEventListener(this.container);
  }
  /*---------------------------------------------------------------------------
  * 初始化事件监听
  --------------------------------------------------------------------------- */
  initEventListener(element) {
    let mousedown = false
    // 触摸开始事件
    element.addEventListener('touchstart', e => {
      if (!e.target.tagName.match(/input|textarea|select/i)) {
        this.doTouchStart(e.touches, e.timeStamp)
      }
    })
    // 触摸移动事件
    element.addEventListener('touchmove', e => {
      e.preventDefault()
      this.doTouchMove(e.touches, e.timeStamp)
    })
    // 触摸结束事件
    element.addEventListener('touchend', e => {
      this.doTouchEnd(e.timeStamp)
    })
    // 鼠标点击事件
    element.addEventListener('mousedown', e => {
      if (!e.target.tagName.match(/input|textarea|select/i)) {
        this.doTouchStart([{
          pageX: e.pageX,
          pageY: e.pageY
        }], e.timeStamp)
        mousedown = true
      }
    })
    // 鼠标移动事件
    element.addEventListener('mousemove', e => {
      if (mousedown) {
        this.doTouchMove([{
          pageX: e.pageX,
          pageY: e.pageY
        }], e.timeStamp)
        mousedown = true
      }
    })
    // 鼠标离开事件
    element.addEventListener('mouseup', e => {
      if (mousedown) {
        this.doTouchEnd(e.timeStamp)
        mousedown = false
      }
    })
  }
  /*---------------------------------------------------------------------------
  * 验证触摸事件
  --------------------------------------------------------------------------- */
  // 是否有触摸
  _isTouches(touches){
    if (touches.length == null) {
      throw new Error("Invalid touch list: " + touches);
    }
  }
  // 检测时间戳
  _isDateType(timeStamp){
    if (timeStamp instanceof Date) {
      timeStamp = timeStamp.valueOf();
    }
    if (typeof timeStamp !== "number") {
      throw new Error("Invalid timestamp value: " + timeStamp);
    }
  }
   /*---------------------------------------------------------------------------
  * 事件监听操作
  --------------------------------------------------------------------------- */
  // 触摸开始的时候，如果有动画正在运行，或者正在减速的时候都需要停止当前动画
  doTouchStart(touches, timeStamp) {
    this._isTouches(touches);
    this._isDateType(timeStamp);
    // 当处理两个手指时使用中心点
    let currentTouchX = touches[0].pageX;
    let currentTouchY = touches[0].pageY;
    // 存储初始触摸位置
    this.lastTouchX = currentTouchX;
    this.lastTouchY = currentTouchY;
    // 存储初始移动时间戳
    this.lastTouchMoveTime = timeStamp;
    // 重置跟踪标记
    this.isTracking = true;
  }
  // 触摸滑动的时候，
  doTouchMove(touches, timeStamp) {
    this._isTouches(touches);
    this._isDateType(timeStamp)
    // 不启用跟踪时忽略事件(事件可能在元素外部)
    if (!this.isTracking) {
      return;
    }
    // 当处理两个手指时使用中心点
    let currentTouchX = touches[0].pageX;
    let currentTouchY = touches[0].pageY;
    // 是否已经进入了拖拽模式
    if (this.isDragging) {
      // 计算移动的距离
      let moveX = currentTouchX - this.lastTouchX;
      let moveY = currentTouchY - this.lastTouchY;
      // 是否开启了横向滚动
      if (this.enableScrollX) {
        this.scrollX -= moveX * this.options.speedMultiplier;
        if (this.scrollX > this.maxWisthScrollX || this.scrollX < 0) {
          // 在边缘放慢速度
          if (this.options.bouncing) {
            this.scrollX += (moveX / 2 * this.options.speedMultiplier);
          } else if (this.scrollX > this.maxWisthScrollX) {
            this.scrollX = this.maxWisthScrollX;
          } else {
            this.scrollX = 0;
          }
        }
      }
      // 是否开启了纵向滚动
      if (this.enableScrollY) {
        this.scrollY -= moveY * this.options.speedMultiplier;
        if (this.scrollY > this.maxWisthScrollX || this.scrollY < 0) {
          // 在边缘放慢速度
          if (this.options.bouncing) {
            this.scrollY += (moveY / 2 * this.options.speedMultiplier);
            // 支持下拉刷新(仅当只有y可滚动时)
            if (!this.enableScrollX && this.refreshHeight != null) {
              if (!this.refreshActive && this.scrollY <= -this.refreshHeight) {
                this.refreshActive = true;
                if (this.refreshActivateCallBack) {
                  this.refreshActivateCallBack();
                }
              } else if (this.refreshActive && this.scrollY > -this.refreshHeight) {
                this.refreshActive = false;
                if (this.refreshDeactivateCallBack) {
                  this.refreshDeactivateCallBack();
                }
              }
            }
          } else if (this.scrollY > this.maxWisthScrollX) {
            this.scrollY = this.maxWisthScrollX;
          } else {
            this.scrollY = 0;
          }
        }
      }
      // 防止列表无限增长(保持最小10，最大20测量点)
      if (this.positionsArray.length > 60) {
        this.positionsArray.splice(0, 30);
      }
      // 跟踪滚动的运动
      this.positionsArray.push(this.scrollX, this.scrollY, timeStamp);
      // 同步滚动位置
      this._publish(this.scrollX, this.scrollY);
      // 否则，看看我们现在是否切换到拖拽模式。
    } else {
      let minTrackingForScroll = 0;  // 最小滚动距离
      let minTrackingForDrag = 5;    // 最小拖拽距离

      let distanceX = Math.abs(currentTouchX - this.lastTouchX);  // 横向滑动距离绝对值
      let distanceY = Math.abs(currentTouchY - this.lastTouchY);  // 纵向滑动距离绝对值
      // 根据滑动距离 是否大于等于最小滚动距离来开启滚动方向
      this.enableScrollX = this.options.scrollingX && distanceX >= minTrackingForScroll;
      this.enableScrollY = this.options.scrollingY && distanceY >= minTrackingForScroll;
      // 放入位置列表
      this.positionsArray.push(this.scrollX, this.scrollY, timeStamp);
      // 当开启了任意一方向的滚动和有一定的触摸滑动距离后开启拖拽模式
      let isEnableScroll = this.enableScrollX || this.enableScrollY;
      let isDistance = distanceX >= minTrackingForDrag || distanceY >= minTrackingForDrag;
      this.isDragging = isEnableScroll && isDistance
      // 如果进入拖拽模式解除动画中断标志
      if (this.isDragging) {
        this._interruptedAnimation = false;
      }
    }
    // 为下一个事件更新上次触摸的位置和时间戳
    this.lastTouchX = currentTouchX;
    this.lastTouchY = currentTouchY;
    this.lastTouchMoveTime = timeStamp;
  }
  // 触摸事件结束
  doTouchEnd(timeStamp) {
    this._isDateType(timeStamp)
    // 未启用跟踪时忽略事件(元素上没有touchstart事件)
    // 这是必需的，因为这个监听器(“touchmove”)位于文档上，而不是它所在的元素上。
    if (!this.isTracking) {
      return;
    }
    // 不再触摸(当两根手指触碰屏幕时，有两个触摸结束事件)
    this.isTracking = false;
    // 现在一定要重置拖拽标志。这里我们也检测是否手指移动得足够快，可以切换到减速动画。
    if (this.isDragging) {
      // 重置拖拽标志
      this.isDragging = false;
      // 开始减速 验证最后一次检测到的移动是否在某个相关的时间范围内
      if (this.isSingleTouch && this.options.animating && (timeStamp - this.lastTouchMoveTime) <= 100) {
        // 然后计算出100毫秒前滚动条的位置
        let endPos = this.positionsArray.length - 1;
        let startPos = endPos;
        // 将指针移动到100ms前测量的位置
        for (let i = endPos; i > 0 && this.positionsArray[i] > (this.lastTouchMoveTime - 100); i -= 3) {
          startPos = i;
        }
        // 如果开始和停止位置在100ms时间内相同，我们无法计算任何有用的减速。
        if (startPos !== endPos) {
          // 计算这两点之间的相对运动
          let timeOffset = this.positionsArray[endPos] - this.positionsArray[startPos];
          let movedX = this.scrollX - this.positionsArray[startPos - 2];
          let movedY = this.scrollY - this.positionsArray[startPos - 1];
          // 基于50ms计算每个渲染步骤的移动
          this.decelerationVelocityX = movedX / timeOffset * (1000 / 60);
          this.decelerationVelocityY = movedY / timeOffset * (1000 / 60);
          // 开始减速需要多少速度
          let minVelocityToStartDeceleration = this.options.paging || this.options.snapping ? 4 : 1;;
          // 验证我们有足够的速度开始减速
          let isVelocityX = Math.abs(this.decelerationVelocityX) > minVelocityToStartDeceleration
          let isVelocityY = Math.abs(this.decelerationVelocityY) > minVelocityToStartDeceleration
          // 非下拉刷新状态时候开启减速 否则 结束操作
          if (isVelocityX || isVelocityY) {
            // 减速时关闭下拉刷新功能
            if (!this.refreshActive) {
              this._startDeceleration(timeStamp);
            }
          } else {
            this.options.scrollingComplete();
            // console.log('无减速操作结束滑动')
          }
        } else {
          this.options.scrollingComplete();
          // console.log('滑动位置太短结束滑动')
        }
      } else if ((timeStamp - this.lastTouchMoveTime) > 100) {
        this.options.scrollingComplete();
        // console.log('正常滑动')
      }
    }
    // 如果这是一个较慢的移动，它是默认不减速，但这个仍然意味着我们想要回到这里的边界。为了提高边缘盒的稳定性，将其置于上述条件之外
    // 例如，touchend在没有启用拖放的情况下被触发。这通常不应该修改了滚动条的位置，甚至显示了滚动条。
    if (!this.isDecelerating) {
      if (this.refreshActive && this.refreshStartCallBack) {
        // 使用publish而不是scrollTo来允许滚动到超出边界位置
        // 我们不需要在这里对scrollLeft、zoomLevel等进行规范化，因为我们只在启用了滚动刷新时进行y滚动
        this._publish(this.scrollX, -this.refreshHeight, true);
        if (this.refreshStartCallBack) {
          this.refreshStartCallBack();
        }
      } else {
        if (this._interruptedAnimation || this.isDragging) {
          this.options.scrollingComplete();
        }

        if(this.scrollY > 0 || this.scrollX > 0){
          this.scrollTo(this.scrollX, this.scrollY, true);
        }else{
          this._startDeceleration();
        }
        // Directly signalize deactivation (nothing todo on refresh?)
        // 直接对失活进行签名(在刷新时不做任何操作?)
        if (this.refreshActive) {
          this.refreshActive = false;
          if (this.refreshDeactivateCallBack) {
            this.refreshDeactivateCallBack();
          }
        }
      }
    }
    // 完全清除列表
    this.positionsArray.length = 0;
  }
}