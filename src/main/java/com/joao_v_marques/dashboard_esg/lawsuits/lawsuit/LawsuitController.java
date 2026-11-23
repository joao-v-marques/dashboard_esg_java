package com.joao_v_marques.dashboard_esg.lawsuits.lawsuit;

import com.joao_v_marques.dashboard_esg.lawsuits.lawsuit.dto.LawsuitRequest;
import com.joao_v_marques.dashboard_esg.lawsuits.lawsuit.dto.LawsuitResponse;
import com.joao_v_marques.dashboard_esg.shared.security.UserPrincipal;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/lawsuits")
public class LawsuitController {

    private final LawsuitService service;

    public LawsuitController(LawsuitService service) {
        this.service = service;
    }

    // GET de todos os processos cadastrados no sistema
    @GetMapping
    public List<LawsuitResponse> findAll() {
        return service.findAll();
    }

    // POST de um novo processo no sistema
    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<LawsuitResponse> create(@Valid @RequestBody LawsuitRequest request, @AuthenticationPrincipal UserPrincipal currentUser) {
        LawsuitResponse created = service.create(request, currentUser);

        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(created.id())
                .toUri();

        return ResponseEntity.created(location).body(created);
    }
}
