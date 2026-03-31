import { useEffect, useId, useRef, useState } from 'react'
import { Camera, CameraOff } from 'lucide-react'
import { Html5Qrcode } from 'html5-qrcode'

interface QRScannerProps {
  onScan: (qrCode: string) => void
}

export default function QRScanner({ onScan }: QRScannerProps) {
  const readerId = useId().replace(/:/g, '-')
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const scanLockRef = useRef(false)
  const [isRunning, setIsRunning] = useState(false)
  const [isStarting, setIsStarting] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)

  const startCamera = async () => {
    if (!scannerRef.current || isRunning || isStarting) {
      return
    }

    try {
      setIsStarting(true)
      setCameraError(null)
      scanLockRef.current = false
      await scannerRef.current.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1,
        },
        async (decodedText) => {
          if (scanLockRef.current) {
            return
          }

          scanLockRef.current = true
          onScan(decodedText)
          if (scannerRef.current) {
            try {
              await scannerRef.current.stop()
            } catch {
              // Ignora falha caso a instância já tenha sido desmontada.
            }
            setIsRunning(false)
            scanLockRef.current = false
          }
        },
        () => {
          // Ignora erros de leitura durante tentativa de foco.
        },
      )
      setIsRunning(true)
    } catch {
      setCameraError('Não foi possível acessar a câmera. Verifique permissões.')
      setIsRunning(false)
    } finally {
      setIsStarting(false)
    }
  }

  const stopCamera = async () => {
    if (!scannerRef.current || !isRunning) {
      return
    }

    try {
      await scannerRef.current.stop()
      setIsRunning(false)
      scanLockRef.current = false
    } catch {
      setCameraError('Erro ao parar a câmera.')
    }
  }

  useEffect(() => {
    const scanner = new Html5Qrcode(readerId)
    scannerRef.current = scanner

    return () => {
      const cleanup = async () => {
        if (!scannerRef.current) {
          return
        }

        try {
          await scannerRef.current.stop()
        } catch {
          // Ignora caso a câmera já esteja parada.
        }

        try {
          await scannerRef.current.clear()
        } catch {
          // Silencia falha de limpeza ao desmontar.
        }
      }

      void cleanup()
      scannerRef.current = null
    }
  }, [readerId])

  return (
    <div className="custom-qr">
      <div id={readerId} className="custom-qr-view" />

      <div className="custom-qr-actions">
        {isRunning ? (
          <button type="button" className="ghost" onClick={() => void stopCamera()}>
            <CameraOff size={16} /> Parar câmera
          </button>
        ) : (
          <button type="button" className="ghost" onClick={() => void startCamera()} disabled={isStarting}>
            <Camera size={16} /> {isStarting ? 'Iniciando câmera...' : 'Ativar câmera'}
          </button>
        )}
      </div>

      {cameraError && <p className="custom-qr-error">{cameraError}</p>}
    </div>
  )
}
