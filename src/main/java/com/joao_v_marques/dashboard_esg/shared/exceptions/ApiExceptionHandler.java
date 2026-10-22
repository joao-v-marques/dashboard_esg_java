package com.joao_v_marques.dashboard_esg.shared.exceptions;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.BindException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class ApiExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(ApiExceptionHandler.class);

    // Exception de validação das DTOs (@Valid), retorna o erro de cada campo
    @ExceptionHandler(BindException.class)
    public ResponseEntity<ApiError> handleValidation(BindException ex) {
        Map<String, String> fields = new HashMap<>();
        ex.getBindingResult().getFieldErrors().forEach(error ->
                fields.putIfAbsent(error.getField(), messageOf(error)));

        return ResponseEntity.badRequest()
                .body(new ApiError("Revise os campos destacados.", fields));
    }

    // Exception padrão para erros em campos. Regras de negócio no geral.
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiError> handleBusinessExceptions(IllegalArgumentException ex) {
        return ResponseEntity.badRequest()
                .body(ApiError.of(ex.getMessage()));
    }

    // Exception de corpo ausente, JSON mal formatado ou tipo de campo incompatível
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiError> handleUnreadableBody(HttpMessageNotReadableException ex) {
        return ResponseEntity.badRequest()
                .body(ApiError.of("Não foi possível ler o corpo da requisição. Envie um JSON válido."));
    }

    // Tratamento de erro para Violação de chave unique no banco
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiError> handleDataIntegrity(DataIntegrityViolationException ex) {
        log.warn("Violação de integridade: ", ex);
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(ApiError.of("A operação conflita com um registro já existente. Verifique os dados e tente novamente."));
    }

    // Recurso não encontrado pelo ID/parâmetro informado
    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiError> handleNotFoundException(ResourceNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(ApiError.of(ex.getMessage()));
    }

    // Tratamento para retornar 404 em rotas não existentes na aplicação
    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ApiError> handleNotFound(NoResourceFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(ApiError.of("Endereço não encontrado"));
    }

    // Tratamento para erro de conflito -> 409
    @ExceptionHandler(ConflictException.class)
    public ResponseEntity<ApiError> handleConflict(ConflictException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(ApiError.of(ex.getMessage()));
    }

    // Tratamento para falha na comunicação com outra aplicação -> 502
    @ExceptionHandler(UpstreamException.class)
    public ResponseEntity<ApiError> handleUpstream(UpstreamException ex) {
        log.warn("Falha na integração: {}", ex.getMessage(), ex.getCause());
        return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                .body(ApiError.of(ex.getMessage()));
    }

    private String messageOf(FieldError error) {
        return error.isBindingFailure()
                ? "O valor informado não é válido para este campo."
                : error.getDefaultMessage();
    }
}
