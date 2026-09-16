import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:socket_io_client/socket_io_client.dart' as IO;

void main() {
  runApp(const LectorApp());
}

class LectorApp extends StatelessWidget {
  const LectorApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Lector de códigos',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: Colors.deepPurple,
        ),
        useMaterial3: true,
      ),
      home: const ScannerScreen(),
    );
  }
}

class ScannerScreen extends StatefulWidget {
  const ScannerScreen({super.key});

  @override
  State<ScannerScreen> createState() => _ScannerScreenState();
}

class _ScannerScreenState extends State<ScannerScreen> {
  final MobileScannerController controller =
      MobileScannerController();

  IO.Socket? socket;

  String codigoDetectado = '';

  bool encontrado = false;

  bool conectado = false;

  String estado = 'Conectando...';

  @override
  void initState() {
    super.initState();

    conectarServidor();
  }

  // ==========================================
  // CONECTAR CON EL SERVIDOR
  // ==========================================

  void conectarServidor() {
    socket = IO.io(
      'http://192.168.1.79:3000',
      IO.OptionBuilder()
          .setTransports(['websocket'])
          .disableAutoConnect()
          .build(),
    );

    socket!.onConnect((_) {
      print('Conectado al servidor ✅');

      if (mounted) {
        setState(() {
          conectado = true;
          estado = 'Servidor conectado ✅';
        });
      }
    });

    socket!.onDisconnect((_) {
      print('Desconectado del servidor ❌');

      if (mounted) {
        setState(() {
          conectado = false;
          estado = 'Servidor desconectado ❌';
        });
      }
    });

    socket!.onConnectError((error) {
      print('Error de conexión Socket.IO ❌');
      print(error);

      if (mounted) {
        setState(() {
          conectado = false;
          estado = 'Error de conexión ❌';
        });
      }
    });

    socket!.connect();
  }

  // ==========================================
  // DETECTAR CÓDIGO
  // ==========================================

  void codigoEncontrado(BarcodeCapture capture) {
    if (encontrado) {
      return;
    }

    for (final barcode in capture.barcodes) {
      final String? codigo = barcode.rawValue;

      if (codigo != null && codigo.isNotEmpty) {
        print('=================================');
        print('📷 CÓDIGO DETECTADO');
        print('Código: $codigo');
        print('=================================');

        setState(() {
          encontrado = true;
          codigoDetectado = codigo;
          estado = 'Código detectado ✅';
        });

        controller.stop();

        enviarCodigo(codigo);

        break;
      }
    }
  }

  // ==========================================
  // ENVIAR CÓDIGO
  // ==========================================

  void enviarCodigo(String codigo) {
    print('Intentando enviar código...');

    if (socket == null) {
      print('❌ Socket es null');
      return;
    }

    if (!conectado) {
      print('❌ Socket no está conectado');
      return;
    }

    print('📤 Enviando código: $codigo');

    socket!.emit(
      'codigo_escaneado',
      {
        'codigo': codigo,
      },
    );

    print('✅ Evento enviado al servidor');

    if (mounted) {
      setState(() {
        estado = 'Código enviado al servidor ✅';
      });
    }
  }

  // ==========================================
  // ESCANEAR OTRO
  // ==========================================

  void volverAIntentar() {
    setState(() {
      encontrado = false;
      codigoDetectado = '';
      estado = conectado
          ? 'Servidor conectado ✅'
          : 'Servidor desconectado ❌';
    });

    controller.start();
  }

  @override
  void dispose() {
    controller.dispose();

    socket?.disconnect();

    socket?.dispose();

    super.dispose();
  }

  // ==========================================
  // INTERFAZ
  // ==========================================

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'Escanear código',
        ),
        centerTitle: true,

        actions: [
          Padding(
            padding: const EdgeInsets.only(
              right: 15,
            ),
            child: Center(
              child: Icon(
                conectado
                    ? Icons.cloud_done
                    : Icons.cloud_off,
                color: conectado
                    ? Colors.green
                    : Colors.red,
              ),
            ),
          ),
        ],
      ),

      body: Stack(
        children: [
          // ==================================
          // CÁMARA
          // ==================================

          MobileScanner(
            controller: controller,
            onDetect: codigoEncontrado,
          ),

          // ==================================
          // MARCO
          // ==================================

          Center(
            child: Container(
              width: 300,
              height: 140,
              decoration: BoxDecoration(
                border: Border.all(
                  color: Colors.white,
                  width: 3,
                ),
                borderRadius:
                    BorderRadius.circular(15),
              ),
            ),
          ),

          // ==================================
          // INFORMACIÓN
          // ==================================

          Positioned(
            left: 20,
            right: 20,
            bottom: 40,
            child: Column(
              children: [
                Container(
                  width: double.infinity,
                  padding:
                      const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                    color: Colors.black
                        .withOpacity(0.75),
                    borderRadius:
                        BorderRadius.circular(15),
                  ),
                  child: Column(
                    children: [
                      Text(
                        estado,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 15,
                        ),
                      ),

                      const SizedBox(
                        height: 10,
                      ),

                      const Text(
                        'Código detectado',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 15,
                        ),
                      ),

                      const SizedBox(
                        height: 8,
                      ),

                      Text(
                        codigoDetectado.isEmpty
                            ? 'Apunta al código de barras'
                            : codigoDetectado,
                        textAlign:
                            TextAlign.center,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 24,
                          fontWeight:
                              FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ),

                if (encontrado) ...[
                  const SizedBox(
                    height: 15,
                  ),

                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed:
                          volverAIntentar,
                      child: const Text(
                        'Escanear otro código',
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}
