import AppKit

let symbols = [
    "heart.fill", "waveform.path.ecg", "figure.walk", "moon.zzz.fill",
    "flame.fill", "stopwatch.fill", "lungs.fill", "drop.fill", "wind",
    "laurel.leading", "fork.knife", "leaf.fill", "cube.fill",
    "drop.triangle.fill", "s.circle.fill", "bolt.fill", "k.circle.fill",
    "waterbottle.fill", "shoeprints.fill", "figure.run", "bed.double.fill",
    "exclamationmark.triangle.fill", "wineglass.fill", "laptopcomputer",
    "figure.stairs", "clock.fill", "cup.and.saucer.fill", "iphone",
    "house.fill", "hourglass", "mountain.2.fill", "applewatch",
    "circle.grid.2x2.fill", "fish.fill", "birthday.cake.fill",
    "takeoutbag.and.cup.and.straw.fill", "square.fill", "sun.max.fill"
]

let fileManager = FileManager.default
let output = URL(fileURLWithPath: CommandLine.arguments.dropFirst().first ?? "health/assets/sf-symbols",
                 isDirectory: true)
try fileManager.createDirectory(at: output, withIntermediateDirectories: true)

let canvas = NSSize(width: 128, height: 128)
let configuration = NSImage.SymbolConfiguration(pointSize: 72, weight: .semibold)

for symbol in symbols {
    guard let image = NSImage(systemSymbolName: symbol, accessibilityDescription: nil)?
        .withSymbolConfiguration(configuration) else {
        fputs("Unavailable SF Symbol: \(symbol)\n", stderr)
        continue
    }

    guard let bitmap = NSBitmapImageRep(
        bitmapDataPlanes: nil,
        pixelsWide: Int(canvas.width),
        pixelsHigh: Int(canvas.height),
        bitsPerSample: 8,
        samplesPerPixel: 4,
        hasAlpha: true,
        isPlanar: false,
        colorSpaceName: .deviceRGB,
        bytesPerRow: 0,
        bitsPerPixel: 0
    ) else { continue }

    bitmap.size = canvas
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: bitmap)
    NSGraphicsContext.current?.imageInterpolation = .high
    NSColor.clear.setFill()
    NSRect(origin: .zero, size: canvas).fill()

    let sourceSize = image.size
    // Keep the PNG canvas consistent while matching the optical size of the
    // SwiftUI glyph. The old 92pt inset made a 16px web symbol render at only
    // ~11.5px, which was especially noticeable in Safari.
    let scale = min(116 / sourceSize.width, 116 / sourceSize.height)
    let drawSize = NSSize(width: sourceSize.width * scale, height: sourceSize.height * scale)
    let drawRect = NSRect(x: (canvas.width - drawSize.width) / 2,
                          y: (canvas.height - drawSize.height) / 2,
                          width: drawSize.width,
                          height: drawSize.height)
    image.draw(in: drawRect, from: .zero, operation: .sourceOver, fraction: 1)
    NSGraphicsContext.restoreGraphicsState()

    if let png = bitmap.representation(using: .png, properties: [:]) {
        try png.write(to: output.appendingPathComponent("\(symbol).png"))
    }
}
