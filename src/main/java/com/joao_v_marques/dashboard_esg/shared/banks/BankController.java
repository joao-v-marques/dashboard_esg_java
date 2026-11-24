package com.joao_v_marques.dashboard_esg.shared.banks;

import com.joao_v_marques.dashboard_esg.shared.banks.dto.BankRequest;
import com.joao_v_marques.dashboard_esg.shared.banks.dto.BankResponse;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/banks")
public class BankController {

    private final BankService service;

    public BankController(BankService service) {
        this.service = service;
    }

    // GET de todos os bancos cadastrados no sistema
    @GetMapping
    public List<BankResponse> findAll() {
        return service.findAll();
    }

    // POST de um novo banco no sistema
    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<BankResponse> create(@Valid @RequestBody BankRequest request) {
        BankResponse created = service.create(request);

        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(created.id())
                .toUri();

        return ResponseEntity.created(location).body(created);
    }

    // PUT de um banco já existente
    @PutMapping(value = "/{id}", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<BankResponse> update(@PathVariable Integer id, @Valid @RequestBody BankRequest request) {
        BankResponse updated = service.update(id, request);

        return ResponseEntity.ok(updated);
    }

    // PATCH para desativar um banco já existente
    @PatchMapping(value = "/{id}/deactivate")
    public ResponseEntity<BankResponse> deactivate(@PathVariable Integer id) {
        BankResponse deactivated = service.deactivate(id);

        return ResponseEntity.ok(deactivated);
    }

    // PATCH para reativar um banco já existente
    @PatchMapping(value = "/{id}/reactivate")
    public ResponseEntity<BankResponse> reactivate(@PathVariable Integer id) {
        BankResponse reactivated = service.reactivate(id);

        return ResponseEntity.ok(reactivated);
    }
}
