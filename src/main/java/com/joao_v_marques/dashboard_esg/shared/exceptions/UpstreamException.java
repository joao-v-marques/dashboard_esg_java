package com.joao_v_marques.dashboard_esg.shared.exceptions;

// Falha ao consultar outra aplicação (ex.: certificados-cooperados fora do ar, lento ou respondendo erro) -> 502
public class UpstreamException extends RuntimeException {

    public UpstreamException(String message) {
        super(message);
    }

    public UpstreamException(String message, Throwable cause) {
        super(message, cause);
    }
}
