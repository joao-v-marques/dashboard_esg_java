package com.joao_v_marques.dashboard_esg.suppliers.supplier_qualification;

import com.joao_v_marques.dashboard_esg.shared.security.UserPrincipal;
import com.joao_v_marques.dashboard_esg.suppliers.supplier_qualification.dto.SupplierQualificationRequest;
import com.joao_v_marques.dashboard_esg.suppliers.supplier_qualification.dto.SupplierQualificationResponse;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/supplier-qualifications")
public class SupplierQualificationController {

    private final SupplierQualificationService service;

    public SupplierQualificationController(SupplierQualificationService service) {
        this.service = service;
    }

    // GET de todas as fichas de qualificação de fornecedores
    @GetMapping
    public List<SupplierQualificationResponse> findAll() {
        return service.findAll();
    }

    // POST de uma nova ficha de qualificação de fornecedor
    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<SupplierQualificationResponse> create(@Valid @RequestBody SupplierQualificationRequest request, @AuthenticationPrincipal UserPrincipal currentUser) {
        SupplierQualificationResponse created = service.create(request, currentUser);

        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(created.id())
                .toUri();

        return ResponseEntity.created(location).body(created);
    }
}
