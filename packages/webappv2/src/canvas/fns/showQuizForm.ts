import type { AbstractMesh } from '@babylonjs/core'
import type { AdvancedDynamicTexture } from '@babylonjs/gui'
import { Ellipse, Line, Rectangle, TextBlock } from '@babylonjs/gui'

let rect1: Rectangle
let label: TextBlock
let target: Ellipse
let line: Line

export function showQuizForm(ball: AbstractMesh, advancedTexture: AdvancedDynamicTexture) {
  if (!rect1) {
    rect1 = new Rectangle()
    rect1.width = 0.15
    rect1.height = '40px'
    rect1.cornerRadius = 20
    rect1.color = 'Orange'
    rect1.thickness = 4

    rect1.background = '#e3232b'
    advancedTexture.addControl(rect1)
    rect1.linkOffsetY = -100
  }

  if (!label) {
    label = new TextBlock()
    label.color = 'white'
    label.textWrapping = true
    label.fontSize = '12px'
    label.paddingLeft = '10px'
    label.resizeToFit = true
    rect1.addControl(label)
  }

  if (!target) {
    target = new Ellipse()
    target.width = '40px'
    target.height = '40px'
    target.color = 'Orange'
    target.thickness = 4
    target.background = '#042182'
    advancedTexture.addControl(target)
  }

  if (!line) {
    line = new Line()
    line.lineWidth = 4
    line.color = 'Orange'
    line.y2 = 20
    line.linkOffsetY = -20
    advancedTexture.addControl(line)
    line.connectedControl = rect1
  }

  rect1.linkWithMesh(ball)
  target.linkWithMesh(ball)
  line.linkWithMesh(ball)

  label.text = 'Câu mô tả "Nền tảng phân tích lợi nhuận giúp người bán hàng trên Shopify nhìn thấy bức tranh tổng thể hoàn chỉnh, tập trung trực tiếp vào số liệu cuối cùng: Net Profit."  thuộc về sản phẩm nào?'
}
