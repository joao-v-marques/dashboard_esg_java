package com.joao_v_marques.dashboard_esg.nips.nip;

import com.joao_v_marques.dashboard_esg.nips.nip.dto.NipRequest;
import com.joao_v_marques.dashboard_esg.nips.nip.dto.NipResponse;
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
@RequestMapping("/api/nips")
public class NipController {

    private final NipService nipService;

    public NipController(NipService nipService) {
        this.nipService = nipService;
    }

    // GET de todas as NIPs cadastradas no sistema
    @GetMapping
    public List<NipResponse> findAll() {
        return nipService.findAll();
    }

    // POST de uma nova NIP no sistema
    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<NipResponse> create(@Valid @RequestBody NipRequest request, @AuthenticationPrincipal UserPrincipal currentUser) {
        NipResponse created = nipService.create(request, currentUser);

        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(created.id())
                .toUri();

        return ResponseEntity.created(location).body(created);
    }
}
