package com.joao_v_marques.dashboard_esg.nips.nip;

import com.joao_v_marques.dashboard_esg.nips.nip.dto.NipResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

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
}
